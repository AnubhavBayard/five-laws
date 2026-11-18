import { Backup, deleteAll, exportAll, importAll, parseBackup } from './backup';
import { setDb } from './client';
import { checkins, fears, profileRepo, questionLog } from './repos';
import { migratedTestDb } from './testDb';

const profile = { lifeStage: 'freelancer' as const, areas: ['money' as const], checkinTime: '07:45', aiEnabled: true, aiConsentAt: '2026-11-19T10:00:00.000Z', unloadReminder: false, onboardedAt: '2026-11-19T10:00:00.000Z' };

async function seed() {
  await profileRepo.save(profile);
  await fears.create({ lifeArea: 'money', fear: 'Client pays late', eventDate: '2026-12-01', firstSign: 'No reply to invoice', ifThenPlans: ['If no reply by Friday, then I call.'], actionThisWeek: 'Send a reminder', likelihood: 60, outcome: null, resolvedAt: null });
  await checkins.create({ lifeArea: 'money', text: 'invoices again', cleanedText: null, suggestedPrimary: null, suggestedSecondary: null, confidence: null, chosenLaw: null, entryTable: null, entryId: null });
  await questionLog.create({ lifeArea: 'money', day: '2026-11-19', learningId: null, text: 'What is net 30?' });
}

describe('backup', () => {
  beforeEach(async () => setDb(await migratedTestDb()));

  it('round-trips everything through JSON into an empty phone, keeping ids', async () => {
    await seed();
    const file = JSON.stringify(await exportAll());
    setDb(await migratedTestDb());
    const parsed = parseBackup(file);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    await importAll(parsed);
    expect(await exportAll(new Date(parsed.exportedAt))).toEqual(parsed);
  });

  it('import replaces, rather than merges', async () => {
    await seed();
    const backup = await exportAll();
    await fears.create({ ...backup.tables.fears[0], fear: 'Extra' } as never);
    await importAll(backup);
    expect((await fears.list()).map((f) => f.fear)).toEqual(['Client pays late']);
  });

  it('rejects files that are not a valid export, and changes nothing', async () => {
    await seed();
    const good = await exportAll();
    expect(parseBackup('not json')).toBeNull();
    expect(parseBackup(JSON.stringify({ ...good, app: 'other' }))).toBeNull();
    const badRow = { ...good, tables: { ...good.tables, fears: [{ ...good.tables.fears[0], likelihood: 400 }] } };
    expect(parseBackup(JSON.stringify(badRow))).toBeNull();
    expect(Backup.safeParse(good).success).toBe(true);
  });

  it('rolls back a failed import', async () => {
    await seed();
    const good = await exportAll();
    const dup = { ...good, tables: { ...good.tables, checkins: [...good.tables.checkins, ...good.tables.checkins] } }; // duplicate primary key
    await expect(importAll(dup)).rejects.toThrow();
    expect(await fears.list()).toHaveLength(1);
    expect(await profileRepo.get()).toEqual(profile);
  });

  it('deletes everything, including the profile', async () => {
    await seed();
    await deleteAll();
    const after = await exportAll();
    expect(after.profile).toBeNull();
    expect(Object.values(after.tables).every((t) => t.length === 0)).toBe(true);
  });
});
