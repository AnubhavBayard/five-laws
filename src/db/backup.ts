import { z } from 'zod';
import { getDb } from './client';
import { Brief, Checkin, Decision, Fear, LearningEntry, Problem, QuestionLog, UserProfile } from './entities';
import { briefs, checkins, decisions, fears, learning, profileRepo, problems, questionLog } from './repos';

const REPOS = { checkins, fears, problems, learning_entries: learning, decisions, briefs, question_log: questionLog } as const;

/** The export file. Every row is validated on import with the same schemas the app writes with. */
export const Backup = z.object({
  app: z.literal('five-laws'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  profile: UserProfile.nullable(),
  tables: z.object({
    checkins: z.array(Checkin),
    fears: z.array(Fear),
    problems: z.array(Problem),
    learning_entries: z.array(LearningEntry),
    decisions: z.array(Decision),
    briefs: z.array(Brief),
    question_log: z.array(QuestionLog),
  }),
});
export type Backup = z.infer<typeof Backup>;

export async function exportAll(now = new Date()): Promise<Backup> {
  return {
    app: 'five-laws',
    version: 1,
    exportedAt: now.toISOString(),
    profile: await profileRepo.get(),
    tables: {
      checkins: await checkins.list(),
      fears: await fears.list(),
      problems: await problems.list(),
      learning_entries: await learning.list(),
      decisions: await decisions.list(),
      briefs: await briefs.list(),
      question_log: await questionLog.list(),
    },
  };
}

/** Parses a file's text. Returns null for anything that isn't a valid Five Laws export. */
export function parseBackup(text: string): Backup | null {
  try {
    const r = Backup.safeParse(JSON.parse(text));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

async function clearAll() {
  for (const repo of Object.values(REPOS)) await repo.clear();
  await getDb().run(`DELETE FROM user_profile`);
  await getDb().run(`DELETE FROM ai_step_log`);
}

/** Replaces everything on this phone with the backup, all or nothing. */
export async function importAll(b: Backup): Promise<void> {
  await getDb().tx(async () => {
    await clearAll();
    if (b.profile) await profileRepo.save(b.profile);
    for (const [name, rows] of Object.entries(b.tables) as [keyof typeof REPOS, Backup['tables'][keyof typeof REPOS]][]) {
      const repo = REPOS[name] as { put: (e: (typeof rows)[number]) => Promise<void> };
      for (const row of rows) await repo.put(row);
    }
  });
}

export async function deleteAll(): Promise<void> {
  await getDb().tx(clearAll);
}
