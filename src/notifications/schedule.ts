import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Decision, Fear, UserProfile } from '../db/entities';
import { decisions, fears } from '../db/repos';
import { today } from '../lib/dates';
import { parkAgain, recordOutcome } from '../pipelines/followups';
import { useProfile } from '../store/profile';
import { useDeepLink } from '../store/ui';

export const CHECKIN_ID = 1;
export const FEAR_ACTIONS = 'fear-outcome';
export const DECISION_ACTIONS = 'decision-revisit';
const TODAY_PATH = '/tabs/today';

/** Same entry, same id, every time: rescheduling replaces instead of duplicating. Always > CHECKIN_ID and fits an Android int. */
export function notificationId(kind: string, entryId: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${kind}:${entryId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return 1000 + ((h >>> 0) % 2_000_000_000);
}

/** Local time on a calendar day, e.g. ('2026-11-25', '21:00'). */
export function dayAt(day: string, hhmm: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
}

export type Planned = {
  id: number;
  title: string;
  body: string;
  at: Date | null; // null = daily at `daily`
  daily: { hour: number; minute: number } | null;
  actionTypeId: string | null;
  extra: { path: string; kind: 'checkin' | 'fear' | 'revisit' | 'review'; entryId: string | null };
};

/**
 * Every notification the app should have pending. Bodies stay generic on purpose: they show on the lock screen,
 * so journal text never goes in them. Dates already past are left to Today's follow-up list.
 */
export function plan(profile: UserProfile | null, fs: Fear[], ds: Decision[], now: Date): Planned[] {
  if (!profile) return [];
  const t = profile.checkinTime;
  const [hour = 21, minute = 0] = t.split(':').map(Number);
  const out: Planned[] = [
    {
      id: CHECKIN_ID,
      title: 'Time to check in',
      body: "What's on your mind today? A minute of writing is enough.",
      at: null,
      daily: { hour, minute },
      actionTypeId: null,
      extra: { path: TODAY_PATH, kind: 'checkin', entryId: null },
    },
  ];
  const at = (kind: Planned['extra']['kind'], id: string, day: string, title: string, body: string, actionTypeId: string | null) => {
    const when = dayAt(day, t);
    if (when > now) out.push({ id: notificationId(kind, id), title, body, at: when, daily: null, actionTypeId, extra: { path: TODAY_PATH, kind, entryId: id } });
  };
  for (const f of fs) {
    if (f.outcome === null && f.eventDate) at('fear', f.id, f.eventDate, 'Did it happen?', 'A fear you forecast was due today. Note what actually happened.', FEAR_ACTIONS);
  }
  for (const d of ds) {
    if (d.status === 'parked' && d.revisitOn) at('revisit', d.id, d.revisitOn, 'Time to decide', 'A decision you parked is ready to come back to.', DECISION_ACTIONS);
    if (d.status === 'decided' && d.reviewOn && d.actualOutcome === null) at('review', d.id, d.reviewOn, 'How did it go?', 'Compare what you expected with what happened.', null);
  }
  return out;
}

function toSchema(p: Planned): LocalNotificationSchema {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    schedule: p.daily ? { on: p.daily, allowWhileIdle: true } : { at: p.at ?? undefined, allowWhileIdle: true },
    actionTypeId: p.actionTypeId ?? undefined,
    extra: p.extra,
  };
}

const native = () => Capacitor.isNativePlatform();
let queue: Promise<void> = Promise.resolve();

/** Cancels everything pending and schedules the current plan. Calls run one at a time. Native only; never throws. */
export function rescheduleAll(now = new Date()): Promise<void> {
  queue = queue.then(async () => {
    if (!native()) return;
    try {
      const wanted = plan(useProfile.getState().profile, await fears.list(), await decisions.list(), now);
      const { notifications: pending } = await LocalNotifications.getPending();
      if (pending.length) await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
      if (wanted.length) await LocalNotifications.schedule({ notifications: wanted.map(toSchema) });
    } catch {
      // No permission or no exact alarms: reminders are a convenience; Today still lists what's due.
    }
  });
  return queue;
}

type Extra = Partial<Planned['extra']>;

/** Action buttons, taps and resume. Called once at startup. */
export async function initNotifications(): Promise<void> {
  if (!native()) return;
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        { id: FEAR_ACTIONS, actions: [{ id: 'happened', title: 'Happened' }, { id: 'partly', title: 'Partly' }, { id: 'didnt', title: "Didn't" }] },
        { id: DECISION_ACTIONS, actions: [{ id: 'decide', title: 'Decide now' }, { id: 'park', title: 'Park again' }] },
      ],
    });
    await LocalNotifications.addListener('localNotificationActionPerformed', async ({ actionId, notification }) => {
      const extra = (notification.extra ?? {}) as Extra;
      try {
        if (extra.kind === 'fear' && extra.entryId && (actionId === 'happened' || actionId === 'partly' || actionId === 'didnt')) {
          await recordOutcome(extra.entryId, actionId);
        } else if (extra.kind === 'revisit' && extra.entryId && actionId === 'park') {
          await parkAgain(extra.entryId, today());
        } else {
          useDeepLink.getState().open(extra.path ?? TODAY_PATH); // tap, or "Decide now": Today has the follow-up
        }
      } finally {
        await rescheduleAll();
      }
    });
    await App.addListener('resume', () => void rescheduleAll());
  } catch {
    // Listener setup failing only loses the buttons; taps still open the app.
  }
  await rescheduleAll();
}
