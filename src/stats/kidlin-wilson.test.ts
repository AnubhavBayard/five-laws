import { problemStats } from './kidlin';
import { learningStats, questionStreak } from './wilson';

describe('problemStats', () => {
  it('counts status and ranks tags', () => {
    expect(
      problemStats([
        { status: 'open', tags: ['money', 'rent'] },
        { status: 'resolved', tags: ['rent'] },
        { status: 'open', tags: ['exams', 'rent', 'money'] },
        { status: 'open', tags: ['boss'] },
      ]),
    ).toEqual({ logged: 4, open: 3, resolved: 1, topTags: [{ tag: 'rent', count: 3 }, { tag: 'money', count: 2 }, { tag: 'boss', count: 1 }] });
  });
});

describe('questionStreak', () => {
  it('counts back from today, or from yesterday if today is still empty', () => {
    expect(questionStreak(['2026-11-19', '2026-11-18', '2026-11-18', '2026-11-17', '2026-11-15'], '2026-11-19')).toBe(3);
    expect(questionStreak(['2026-11-18', '2026-11-17'], '2026-11-19')).toBe(2);
    expect(questionStreak(['2026-11-16'], '2026-11-19')).toBe(0);
    expect(questionStreak(['2026-02-28', '2026-03-01'], '2026-03-01')).toBe(2);
  });

  it('summarises learning', () => {
    expect(learningStats([{ changedMind: true }, { changedMind: false }], [{ day: '2026-11-19' }, { day: '2026-11-19' }], '2026-11-19')).toEqual({ topics: 2, changedMind: 1, questions: 2, streak: 1 });
  });
});
