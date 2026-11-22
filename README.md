# Five Laws

An offline-first journaling app that turns five short "laws" into tools you use on your own life:

| Law | Tool | For |
|---|---|---|
| Murphy | Fear forecast | A worry about something that might happen |
| Kidlin | Problem page | A problem that is happening now and feels tangled |
| Wilson | The shelf | Something you are learning |
| Falkland | Decision parking | A decision you are stuck on |
| Gilbert | Brief builder | An unclear task from someone else, or a big goal with no first step |

Ionic React + Capacitor, Android first. The journal lives only on the phone, in SQLite. AI help is optional: each AI step goes through one Supabase Edge Function to OpenRouter, and every step also works by hand.

## Requirements

- Node 24 (`.nvmrc`)
- For Android: Android SDK (`ANDROID_HOME`, e.g. `~/Android/Sdk`) and Java 21
- For running the Edge Function locally: Docker

## Setup

```sh
npm ci                # also copies sql-wasm.wasm into public/assets for browser SQLite
cp .env.example .env  # leave it blank to run with AI off
npm run dev           # http://localhost:5173, uses jeep-sqlite (IndexedDB) instead of native SQLite
```

| Command | What it does |
|---|---|
| `npm run dev` | Browser dev server |
| `npm test` | Vitest (no network) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc` |
| `npm run build` | Production web build into `dist/` |
| `npm run android` | Build, sync and run on a device or emulator |
| `npm run eval` | Live model evaluation of every AI step (see below) |

## AI help (optional)

Without a Supabase URL and anon key in `.env`, the app runs with AI off and every tool shows its manual form.

### What is sent and stored

- Only the text of the step the user taps goes to the server, then to OpenRouter. The journal is never uploaded.
- The server stores nothing the user wrote. It keeps one counter per anonymous user per day (`ai_usage`) to enforce `AI_DAILY_CAP`.
- Server logs hold the step, prompt version, model, latency and whether the answer was valid. They never hold text.
- Users opt in during onboarding or in Settings. The consent time is stored on the device.

### Hosted Supabase

1. Create a project and turn on **Anonymous sign-ins** (Authentication → Providers).
2. Put the project URL and anon key in `.env`:
   ```sh
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
3. Apply the migration and deploy the function:
   ```sh
   npx supabase link --project-ref <ref>
   npx supabase db push
   cp supabase/functions/.env.example supabase/functions/.env   # fill it in, never commit it
   npx supabase secrets set --env-file supabase/functions/.env
   npx supabase functions deploy ai-step
   ```

Secrets for `ai-step`:

| Name | Meaning |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter key |
| `MODEL_FAST` | Model for short extraction steps (routing, questions) |
| `MODEL_WRITER` | Model for steps that write for the user (briefs, messages, insights) |
| `AI_DAILY_CAP` | Requests per user per day, default 60 |

The chosen models must support forced tool calls (`tool_choice` naming one function). Do not set `provider.require_parameters`: OpenRouter then rejects forced `tool_choice` with a 404. Output is validated and retried once regardless.

### Local Supabase

```sh
npx supabase start                                          # needs Docker
npx supabase functions serve ai-step --env-file supabase/functions/.env
```

Then point `.env` at the local URL and anon key that `supabase start` prints.

### How a step runs

The app sends `{ stepId, input, context }`. `handleStep` (`supabase/functions/_shared/runStepCore.ts`) does the following:

1. Checks the step id, input size (4,000 characters in total) and input schema.
2. Counts the request against the daily cap.
3. Makes one forced tool call with `temperature: 0`.
4. Validates the result with Zod, then runs the step's post-checks:
   - vague quotes must be the user's own words
   - the message must ask every open question
   - an insight may only use numbers from the stats
   - dates must be real calendar days
5. If anything fails, retries once with the errors, then gives up with `{ ok: false }`.

The client gives up after 15 seconds. It parses the output again, because nothing from the network is trusted. Every `{ ok: false }` leads to the manual form; Gilbert's message falls back to a code template.

### Evaluating models

```sh
OPENROUTER_API_KEY=... MODEL_FAST=... MODEL_WRITER=... npm run eval            # all 13 steps, 10 fixtures each
OPENROUTER_API_KEY=... MODEL_FAST=... MODEL_WRITER=... npm run eval -- build_brief route_checkin
```

The eval prints pass rate, retries, p50/p95 latency and failure reasons per step, plus how often routing picks the expected law. It exits non-zero below 90% overall. Fixtures are in `scripts/fixtures.ts` and contain no user data. Running it costs API credit.

## Android

```sh
export ANDROID_HOME=$HOME/Android/Sdk
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
# or: npm run android                        # run on a connected device or emulator
```

Reminders use local notifications at the user's check-in time:
- the daily check-in
- a fear's date
- a parked decision's revisit date
- a decision's review date

They are rebuilt on start, on resume and after saves. Lock-screen text never includes journal content. The exact-alarm permission isn't requested, so Android may deliver reminders a few minutes late.

Backups: Settings → Export a backup writes `five-laws-YYYY-MM-DD.json` to the app's private cache and opens the share sheet, so the user picks where it goes (Files, Drive, email). In the browser it downloads instead. Restore reads the file back through the system file picker.

## Code map

```
src/pages          screens (Today, Laws, Chapter, tools, Journal, EntryDetail, Insights, Settings, Onboarding)
src/pipelines      one pure reducer per tool, the check-in router and follow-ups
src/db             SQLite adapters, migrations, repositories, journal, backup (export/import/delete all)
src/ai/runStep.ts  client side of AI steps (gating, anonymous auth, timeout, re-validation)
src/notifications  reminder planning and scheduling, notification actions
src/stats          pure statistics per law
src/content        all long user-facing copy
supabase/functions/_shared   step schemas, registry, prompts, checks, handleStep (shared with the app as @shared/*)
supabase/functions/ai-step   Deno wrapper: auth, daily cap, env, logging
scripts            eval-steps.ts and its fixtures
```

## Testing notes

- Reducers, stats, dates, checks, scheduling, backup and repositories are unit-tested. Repositories run against real SQL through Node's built-in `node:sqlite`.
- Ionic 9's inputs don't receive props or events under jsdom, so screens aren't driven with Testing Library. Check UI flows in a real browser with `npm run dev`.
- `sql.js` is pinned to 1.11.0 to match the code bundled in `jeep-sqlite` 2.8.0. A newer `sql-wasm.wasm` fails to load in the browser.
- The theme's text/background pairs are checked for at least 4.5:1 contrast in both light and dark (`src/theme/contrast.test.ts`).
