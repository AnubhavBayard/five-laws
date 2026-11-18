# Five Laws: conventions

Offline-first Ionic React + Capacitor app (Android first). The full plan is in the Milestone 0 plan; milestones are committed one at a time.

## Commands
- Node 24 (`.nvmrc`). Non-interactive shells may not load nvm: prefix with `export PATH=$HOME/.nvm/versions/node/v24.22.3/bin:$PATH`.
- `npm run dev` (browser), `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`
- Android: `ANDROID_HOME=$HOME/Android/Sdk npm run android` (debug APK: `cd android && ./gradlew assembleDebug`)

## Layout
- `src/pages` screens, `src/components` shared UI, `src/content` all user-facing long copy (chapters, labels)
- `src/store` Zustand stores; `src/db` SQLite (M2); `src/ai` client AI calls (M3); `src/pipelines/<law>.ts` per-law state machines
- `supabase/functions/_shared` code shared by app and Edge Function, imported in the app as `@shared/*`. Must stay free of DOM, Deno and Capacitor APIs.

## Rules
- TypeScript strict, ESLint clean, no `any`, no non-null assertions.
- Pin exact dependency versions (`npm i -E`). React Router stays on 6.x (Ionic router peer).
- AI: code orchestrates. One forced tool per step, Zod-validated, retry once, then `{ ok: false }` and the manual form. Model output is untrusted: never HTML, never auto-acts. Numbers always come from code.
- Every AI step has a manual fallback; the app must work with AI off or offline.
- English-only UI. No lorem ipsum: every string is written for real users.
- Design tokens live in `src/theme/theme.css`. User-written text uses `.hand` (Caveat, pen colour). Key lines use `<mark className="highlight">`. Keep contrast ≥ 4.5:1 in both themes; respect reduced motion.
- Every control has a label. Use rem units so system text size scales.
- Tests: Vitest + RTL, no network. Pure logic (verdicts, dates, stats, checks) gets unit tests.
