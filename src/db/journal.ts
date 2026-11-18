import type { Law, LifeArea } from '@shared/laws';
import { formatDay } from '../lib/dates';
import type { Brief, Checkin, Decision, Fear, LearningEntry, Problem } from './entities';
import { briefs, checkins, decisions, fears, learning, problems } from './repos';

export const JOURNAL_TABLES = ['fears', 'problems', 'learning_entries', 'decisions', 'briefs', 'checkins'] as const;
export type JournalTable = (typeof JOURNAL_TABLES)[number];

export const TABLE_LAW: Record<JournalTable, Law | null> = {
  fears: 'murphy',
  problems: 'kidlin',
  learning_entries: 'wilson',
  decisions: 'falkland',
  briefs: 'gilbert',
  checkins: null,
};

export type JournalItem = {
  table: JournalTable;
  id: string;
  law: Law | null;
  createdAt: string;
  lifeArea: LifeArea;
  title: string;
  status: string;
  /** Lower-cased text of every field, for search. */
  haystack: string;
};

const OUTCOME = { happened: 'It happened', partly: 'Partly happened', didnt: "Didn't happen" } as const;
const DECISION = { open: 'Open', parked: 'Parked', decided: 'Decided', reviewed: 'Reviewed' } as const;

function haystack(e: object): string {
  return Object.values(e)
    .flatMap((v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))) : v && typeof v === 'object' ? [JSON.stringify(v)] : []))
    .join(' ')
    .toLowerCase();
}

type Lists = { fears: Fear[]; problems: Problem[]; learning: LearningEntry[]; decisions: Decision[]; briefs: Brief[]; checkins: Checkin[] };

/** One newest-first list across every tool. Check-ins that became an entry are shown as that entry instead. */
export function toJournal(l: Lists): JournalItem[] {
  const item = (table: JournalTable, e: Fear | Problem | LearningEntry | Decision | Brief | Checkin, title: string, status: string): JournalItem => ({
    table,
    id: e.id,
    law: TABLE_LAW[table],
    createdAt: e.createdAt,
    lifeArea: e.lifeArea,
    title,
    status,
    haystack: haystack(e),
  });
  const ids = new Set([...l.fears, ...l.problems, ...l.learning, ...l.decisions, ...l.briefs].map((e) => e.id));
  return [
    ...l.fears.map((f) => item('fears', f, f.fear, f.outcome ? OUTCOME[f.outcome] : f.eventDate ? `Due ${formatDay(f.eventDate)}` : 'Waiting')),
    ...l.problems.map((p) => item('problems', p, p.whatIsHappening || p.rant, p.status === 'resolved' ? 'Resolved' : 'Open')),
    ...l.learning.map((x) => item('learning_entries', x, x.topic, x.changedMind ? 'Changed my mind' : 'Learning')),
    ...l.decisions.map((d) => item('decisions', d, d.decision, DECISION[d.status])),
    ...l.briefs.map((b) => item('briefs', b, b.taskAsGiven, b.mode === 'goal' ? 'Goal plan' : 'Brief')),
    ...l.checkins.filter((c) => !c.entryId || !ids.has(c.entryId)).map((c) => item('checkins', c, c.text, 'Note')),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type JournalFilter = { law: Law | 'notes' | null; area: LifeArea | null; q: string };

export function filterJournal(items: JournalItem[], f: JournalFilter): JournalItem[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(
    (i) =>
      (f.law === null || (f.law === 'notes' ? i.law === null : i.law === f.law)) &&
      (f.area === null || i.lifeArea === f.area) &&
      words.every((w) => i.haystack.includes(w)),
  );
}

export async function loadJournal(): Promise<JournalItem[]> {
  return toJournal({
    fears: await fears.list(),
    problems: await problems.list(),
    learning: await learning.list(),
    decisions: await decisions.list(),
    briefs: await briefs.list(),
    checkins: await checkins.list(),
  });
}

export const REPO_FOR = { fears, problems, learning_entries: learning, decisions, briefs, checkins } as const;
