import { IonButton, IonRange } from '@ionic/react';
import { useState } from 'react';
import { aiAvailable, runStep } from '../ai/runStep';
import { AiNotice, AiWait, AreaSelect, ListField, SaveError, TextField } from '../components/form';
import Page from '../components/Page';
import { fears } from '../db/repos';
import { formatDay, today } from '../lib/dates';
import { canSaveFear, type FearDraft, finishFear, initMurphy, murphy } from '../pipelines/murphy';
import { usePipeline } from '../pipelines/usePipeline';
import { usePrefill } from '../lib/usePrefill';
import { useProfile } from '../store/profile';

export default function MurphyTool() {
  const area = useProfile((s) => s.profile?.areas[0] ?? 'other');
  const [s, send] = usePipeline(murphy, initMurphy(area));
  const { prefill, link } = usePrefill();
  const [typed, setText] = useState<string | null>(null);
  const text = typed ?? prefill?.text ?? '';
  const [saveError, setSaveError] = useState(false);
  const edit = (patch: Partial<FearDraft>) => send({ type: 'edit', patch });
  const d = s.draft;

  async function submit() {
    if (prefill) edit({ lifeArea: prefill.lifeArea });
    const next = send({ type: 'submit', text, ai: aiAvailable() });
    if (next.step !== 'structuring') return;
    const r = await runStep('structure_fear', { text: next.text, today: today() });
    send(r.ok ? { type: 'ai_ok', output: r.output } : { type: 'ai_fail', reason: r.reason });
  }

  async function save() {
    setSaveError(false);
    try {
      const saved = await fears.create(finishFear(d));
      await link('fears', saved.id);
      send({ type: 'saved', id: saved.id });
    } catch {
      setSaveError(true);
    }
  }

  return (
    <Page title="Fear forecast" backHref="/tabs/laws/murphy">
      {s.step === 'input' && (
        <>
          <h1>What are you afraid will happen?</h1>
          <p className="muted">Write it the way it sounds in your head. Messy is fine.</p>
          <TextField label="Your worry" multiline maxlength={1000} value={text} onChange={setText} placeholder="I keep thinking that…" />
          <div className="actions">
            <IonButton expand="block" disabled={!text.trim()} onClick={submit}>
              Next
            </IonButton>
          </div>
        </>
      )}

      {s.step === 'structuring' && <AiWait label="Turning your worry into a forecast…" onSkip={() => send({ type: 'ai_fail', reason: null })} />}

      {s.step === 'review' && (
        <>
          <h1>Your forecast</h1>
          <AiNotice reason={s.notice} />
          <p className="muted">Check every line. Change anything that isn't quite what you meant.</p>
          <TextField label="The fear, in one sentence" multiline value={d.fear} onChange={(fear) => edit({ fear })} />
          <TextField label="When would it happen?" type="date" helper="Leave it blank if there's no date." value={d.eventDate ?? ''} onChange={(v) => edit({ eventDate: v || null })} />
          <TextField label="The first sign it's starting" value={d.firstSign} onChange={(firstSign) => edit({ firstSign })} />
          <ListField label="If this, then that" itemLabel="Plan" max={2} placeholder="If …, then I …" values={d.ifThenPlans} onChange={(ifThenPlans) => edit({ ifThenPlans })} />
          <TextField label="One thing you can do this week" value={d.actionThisWeek} onChange={(actionThisWeek) => edit({ actionThisWeek })} />
          <IonRange
            className="field"
            label={`How likely does it feel? ${d.likelihood}%`}
            labelPlacement="stacked"
            min={0}
            max={100}
            step={5}
            value={d.likelihood}
            onIonInput={(e) => edit({ likelihood: e.detail.value as number })}
          />
          <AreaSelect value={d.lifeArea} onChange={(lifeArea) => edit({ lifeArea })} />
          <SaveError show={saveError} />
          <div className="actions">
            <IonButton expand="block" disabled={!canSaveFear(d)} onClick={save}>
              Save forecast
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => send({ type: 'back' })}>
              Back to my words
            </IonButton>
          </div>
        </>
      )}

      {s.step === 'saved' && (
        <>
          <h1>Forecast saved.</h1>
          <p className="hand">{d.fear}</p>
          <p>
            {d.eventDate
              ? `Come back on ${formatDay(d.eventDate)} and note what actually happened.`
              : 'When the moment passes, come back and note what actually happened.'}{' '}
            That record is how you learn which fears deserve a plan.
          </p>
          <div className="actions">
            <IonButton expand="block" routerLink="/tabs/today" routerDirection="root">
              Back to Today
            </IonButton>
          </div>
        </>
      )}
    </Page>
  );
}
