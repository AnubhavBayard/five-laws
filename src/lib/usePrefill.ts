import type { LifeArea } from '@shared/laws';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { checkins, problems } from '../db/repos';

export type Prefill = { text: string; lifeArea: LifeArea; problemId: string | null };

/**
 * A tool opened from a Today check-in (?checkin=id) or a Kidlin problem (?problem=id) starts from that text.
 * `link` records which entry the check-in became, once the tool saves.
 */
export function usePrefill() {
  const params = new URLSearchParams(useLocation().search);
  const checkinId = params.get('checkin');
  const problemId = params.get('problem');
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  useEffect(() => {
    let live = true;
    const load = async (): Promise<Prefill | null> => {
      if (checkinId) {
        const c = await checkins.get(checkinId);
        return c && { text: c.text, lifeArea: c.lifeArea, problemId: null };
      }
      if (problemId) {
        const p = await problems.get(problemId);
        return p && { text: p.rant, lifeArea: p.lifeArea, problemId: p.id };
      }
      return null;
    };
    load()
      .then((p) => live && setPrefill(p))
      .catch(() => undefined); // A missing or unreadable source just means a blank tool.
    return () => {
      live = false;
    };
  }, [checkinId, problemId]);

  async function link(entryTable: string, entryId: string) {
    if (!checkinId) return;
    try {
      await checkins.update(checkinId, { entryTable, entryId });
    } catch {
      // The entry itself is saved; a missing link only affects the journal's "from check-in" note.
    }
  }

  return { prefill, link };
}
