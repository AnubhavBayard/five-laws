import { asQuestion, filled, highlightParts, toTags } from './text';

describe('text helpers', () => {
  it('cleans lists and tags', () => {
    expect(filled([' a ', '', '  '])).toEqual(['a']);
    expect(toTags(['Group Project!!', 'group-project', '  ', 'Money & Rent', 'extra'])).toEqual(['group-project', 'money-rent', 'extra']);
  });

  it('turns a line into a question', () => {
    expect(asQuestion('When is it due')).toBe('When is it due?');
    expect(asQuestion('When is it due.')).toBe('When is it due?');
    expect(asQuestion(' Who signs off? ')).toBe('Who signs off?');
  });

  it('highlights quoted parts in order and skips missing or overlapping ones', () => {
    const text = 'Interest is basically money that grows somehow over time.';
    expect(highlightParts(text, ['grows somehow', 'not there', 'BASICALLY', 'somehow over'])).toEqual([
      { text: 'Interest is ', mark: false },
      { text: 'basically', mark: true },
      { text: ' money that ', mark: false },
      { text: 'grows somehow', mark: true },
      { text: ' over time.', mark: false },
    ]);
    expect(highlightParts('abc', [])).toEqual([{ text: 'abc', mark: false }]);
  });
});
