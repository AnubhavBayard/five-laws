import { readFileSync } from 'node:fs';

/** WCAG relative luminance contrast between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (bl ?? 0);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const css = readFileSync('src/theme/theme.css', 'utf8');
const tokens = (block: string) => Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2] ?? '']));
const light = tokens(css.slice(0, css.indexOf('@media (prefers-color-scheme: dark)')));
const dark = { ...light, ...tokens(css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf('}\n}') + 3)) };

// Every text colour against every surface it is drawn on, including buttons (paper on ink) and highlights.
const PAIRS: [string, string][] = [
  ['ink', 'paper'],
  ['ink', 'paper-raised'],
  ['ink-soft', 'paper'],
  ['ink-soft', 'paper-raised'],
  ['pen', 'paper'],
  ['pen', 'paper-raised'],
  ['highlight-ink', 'highlight'],
  ['danger', 'paper'],
  ['danger', 'paper-raised'],
  ['paper', 'ink'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast', (_name, t) => {
  it.each(PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    const [a, b] = [t[fg], t[bg]];
    expect(a && b).toBeTruthy();
    expect(contrast(a ?? '', b ?? '')).toBeGreaterThanOrEqual(4.5);
  });
});

it('reads both themes', () => {
  expect(light.paper).toBe('#faf7f0');
  expect(dark.paper).toBe('#16181d');
});
