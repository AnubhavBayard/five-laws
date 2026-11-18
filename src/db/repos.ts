import { getDb } from './client';
import { decode, encode } from './codec';
import { AiStepLog, Brief, Checkin, Decision, Fear, LearningEntry, Problem, QuestionLog, UserProfile } from './entities';
import { entryRepo } from './repo';

export const checkins = entryRepo('checkins', Checkin);
export const fears = entryRepo('fears', Fear);
export const problems = entryRepo('problems', Problem);
export const learning = entryRepo('learning_entries', LearningEntry);
export const decisions = entryRepo('decisions', Decision);
export const briefs = entryRepo('briefs', Brief);
export const questionLog = entryRepo('question_log', QuestionLog);

const PROFILE_COLS = Object.keys(UserProfile.shape);

export const profileRepo = {
  async get(): Promise<UserProfile | null> {
    const rows = await getDb().all(`SELECT * FROM user_profile WHERE id = 'me'`);
    return rows[0] ? decode(UserProfile, rows[0]) : null;
  },
  async save(p: UserProfile, now = new Date()): Promise<UserProfile> {
    const row = encode(UserProfile.parse(p));
    const stamp = now.toISOString();
    const cols = ['id', 'createdAt', 'updatedAt', ...PROFILE_COLS];
    const updates = ['updatedAt', ...PROFILE_COLS].map((c) => `${c} = excluded.${c}`).join(', ');
    await getDb().run(
      `INSERT INTO user_profile (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      ['me', stamp, stamp, ...PROFILE_COLS.map((c) => row[c] ?? null)],
    );
    return p;
  },
};

/** Dev builds only; callers check import.meta.env.DEV. Never stores user text. */
export async function logAiStep(entry: Omit<AiStepLog, 'id' | 'createdAt'>): Promise<void> {
  const full = AiStepLog.parse({ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  const row = encode(full);
  const cols = Object.keys(AiStepLog.shape);
  await getDb().run(
    `INSERT INTO ai_step_log (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map((c) => row[c] ?? null),
  );
}
