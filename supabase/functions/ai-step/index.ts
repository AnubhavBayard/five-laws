// Deno wrapper around the shared core: auth, daily cap, env models, logging. All step logic lives in _shared.
import { createClient } from '@supabase/supabase-js';
import { handleStep } from '../_shared/runStepCore.ts';

const env = (k: string) => Deno.env.get(k) ?? '';
const CAP = Number(env('AI_DAILY_CAP')) || 60;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, reason: 'bad_input' }, 405);

  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return json({ ok: false, reason: 'unauthorized' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'bad_input' }, 400);
  }

  const { result, meta } = await handleStep(body, {
    fetch,
    apiKey: env('OPENROUTER_API_KEY'),
    models: { FAST: env('MODEL_FAST'), WRITER: env('MODEL_WRITER') },
    checkCap: async () => {
      const { data, error } = await supabase.rpc('increment_ai_usage', { cap: CAP });
      return !error && data === true;
    },
  });
  console.log(JSON.stringify(meta)); // ids, model, timing only; never user text
  return json({ ...result, meta });
});
