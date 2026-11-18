import { LAWS } from '@shared/laws';
import { CHAPTERS } from './chapters';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('chapters', () => {
  it('has one chapter per law, in order', () => {
    expect(CHAPTERS.map((c) => c.law)).toEqual([...LAWS]);
  });

  it.each(CHAPTERS)('$name: paragraphs are at most 60 words and one carries the key line', (c) => {
    for (const p of c.paragraphs) expect(words(p)).toBeLessThanOrEqual(60);
    expect(c.paragraphs.some((p) => p.includes(c.keyLine))).toBe(true);
  });
});
