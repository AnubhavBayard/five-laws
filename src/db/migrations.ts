import type { Db } from './types';

/**
 * Append-only. Never edit a shipped migration: add a new one.
 * Column names are camelCase on purpose so rows map 1:1 onto entity fields.
 */
const ENTRY = `id TEXT PRIMARY KEY, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, lifeArea TEXT NOT NULL`;

export const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
CREATE TABLE user_profile (
  id TEXT PRIMARY KEY CHECK (id = 'me'),
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
  lifeStage TEXT NOT NULL, areas TEXT NOT NULL, checkinTime TEXT NOT NULL,
  aiEnabled INTEGER NOT NULL, aiConsentAt TEXT, unloadReminder INTEGER NOT NULL DEFAULT 0,
  onboardedAt TEXT NOT NULL
);
CREATE TABLE checkins (${ENTRY},
  text TEXT NOT NULL, cleanedText TEXT, suggestedPrimary TEXT, suggestedSecondary TEXT,
  confidence REAL, chosenLaw TEXT, entryTable TEXT, entryId TEXT
);
CREATE TABLE fears (${ENTRY},
  fear TEXT NOT NULL, eventDate TEXT, firstSign TEXT NOT NULL, ifThenPlans TEXT NOT NULL,
  actionThisWeek TEXT NOT NULL, likelihood INTEGER NOT NULL, outcome TEXT, resolvedAt TEXT
);
CREATE TABLE problems (${ENTRY},
  rant TEXT NOT NULL, clarifyQA TEXT NOT NULL, whatIsHappening TEXT NOT NULL, solvedLooksLike TEXT NOT NULL,
  inMyControl TEXT NOT NULL, nextStep TEXT NOT NULL, tags TEXT NOT NULL, status TEXT NOT NULL, resolvedAt TEXT
);
CREATE TABLE learning_entries (${ENTRY},
  topic TEXT NOT NULL, assumptions TEXT NOT NULL, scaryQuestion TEXT NOT NULL, beginnerQuestions TEXT NOT NULL,
  explanation TEXT NOT NULL, review TEXT, learned TEXT NOT NULL, changedMind INTEGER NOT NULL
);
CREATE TABLE decisions (${ENTRY},
  decision TEXT NOT NULL, options TEXT NOT NULL, unknowns TEXT NOT NULL,
  q1 INTEGER, q2 INTEGER, q3 INTEGER, verdict TEXT, revisitOn TEXT, findOut TEXT NOT NULL,
  postponeCount INTEGER NOT NULL, status TEXT NOT NULL, choice TEXT, expectedOutcome TEXT,
  reviewOn TEXT, actualOutcome TEXT
);
CREATE TABLE briefs (${ENTRY},
  mode TEXT NOT NULL, taskAsGiven TEXT NOT NULL, doneLooksLike TEXT NOT NULL, deadline TEXT, approver TEXT,
  openQuestions TEXT NOT NULL, recipient TEXT, message TEXT, subgoals TEXT NOT NULL, nextAction TEXT,
  sourceProblemId TEXT
);
CREATE TABLE question_log (${ENTRY}, day TEXT NOT NULL, learningId TEXT, text TEXT NOT NULL);
CREATE TABLE ai_step_log (
  id TEXT PRIMARY KEY, createdAt TEXT NOT NULL, stepId TEXT NOT NULL, promptVersion TEXT NOT NULL,
  model TEXT NOT NULL, latencyMs INTEGER NOT NULL, ok INTEGER NOT NULL, validationPassed INTEGER NOT NULL,
  retryUsed INTEGER NOT NULL, reason TEXT
);
CREATE INDEX checkins_created ON checkins (createdAt);
CREATE INDEX fears_created ON fears (createdAt);
CREATE INDEX fears_outcome ON fears (outcome, eventDate);
CREATE INDEX problems_created ON problems (createdAt);
CREATE INDEX problems_status ON problems (status);
CREATE INDEX learning_created ON learning_entries (createdAt);
CREATE INDEX decisions_created ON decisions (createdAt);
CREATE INDEX decisions_status ON decisions (status, revisitOn);
CREATE INDEX briefs_created ON briefs (createdAt);
CREATE INDEX question_log_day ON question_log (day);
`,
  },
  { version: 2, sql: `ALTER TABLE user_profile DROP COLUMN unloadReminder;` },
];

export async function migrate(db: Db): Promise<number> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL)`);
  const rows = await db.all(`SELECT MAX(version) AS v FROM schema_migrations`);
  const current = Number(rows[0]?.v ?? 0);
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await db.tx(async () => {
      await db.exec(m.sql);
      await db.run(`INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)`, [
        m.version,
        new Date().toISOString(),
      ]);
    });
  }
  return MIGRATIONS.at(-1)?.version ?? 0;
}
