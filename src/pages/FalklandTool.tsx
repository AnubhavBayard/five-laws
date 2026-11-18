import { IonButton, IonItem, IonList, IonRadio, IonRadioGroup } from '@ionic/react';
import { useState } from 'react';
import { aiAvailable, runStep } from '../ai/runStep';
import { AiNotice, AiWait, AreaSelect, ListField, SaveError, TextField } from '../components/form';
import Page from '../components/Page';
import { VERDICT_COPY } from '../content/tools';
import { decisions } from '../db/repos';
import { formatDay, today } from '../lib/dates';
import { canDecide, canLeaveReview, canPark, type DecisionDraft, falkland, finishDecision, initFalkland } from '../pipelines/falkland';
import { QUESTIONS } from '../pipelines/falkland.verdict';
import { usePipeline } from '../pipelines/usePipeline';
import { useProfile } from '../store/profile';

const yesNo = (v: boolean | null) => (v === null ? undefined : v ? 'yes' : 'no');

export default function FalklandTool() {
  const area = useProfile((s) => s.profile?.areas[0] ?? 'other');
  const [s, send] = usePipeline(falkland, initFalkland(area));
  const [text, setText] = useState('');
  const [saveError, setSaveError] = useState(false);
  const d = s.draft;
  const edit = (patch: Partial<DecisionDraft>) => send({ type: 'edit', patch });
  const options = d.options.map((o) => o.trim()).filter(Boolean);

  async function submit() {
    const next = send({ type: 'submit', text, ai: aiAvailable() });
    if (next.step !== 'extracting') return;
    const r = await runStep('extract_decision', { text: next.text });
    send(r.ok ? { type: 'ai_ok', output: r.output } : { type: 'ai_fail', reason: r.reason });
  }

  async function next() {
    const n = send({ type: 'next', ai: aiAvailable(), today: today() });
    if (n.step !== 'finding') return;
    const r = await runStep('what_to_find_out', {
      decision: n.draft.decision.trim(),
      options: n.draft.options.map((o) => o.trim()).filter(Boolean),
      unknowns: n.draft.unknowns.map((u) => u.trim()).filter(Boolean),
    });
    send(r.ok ? { type: 'ai_ok', output: r.output } : { type: 'ai_fail', reason: r.reason });
  }

  async function save() {
    setSaveError(false);
    try {
      const saved = await decisions.create(finishDecision(d));
      send({ type: 'saved', id: saved.id });
    } catch {
      setSaveError(true);
    }
  }

  const back = (
    <IonButton expand="block" fill="clear" onClick={() => send({ type: 'back' })}>
      Back
    </IonButton>
  );

  return (
    <Page title="Decision parking" backHref="/tabs/laws/falkland">
      {s.step === 'input' && (
        <>
          <h1>What decision are you stuck on?</h1>
          <p className="muted">Write it how it sounds in your head, options and all.</p>
          <TextField label="Your decision" multiline maxlength={1000} value={text} onChange={setText} placeholder="I can't decide whether…" />
          <div className="actions">
            <IonButton expand="block" disabled={!text.trim()} onClick={submit}>
              Next
            </IonButton>
          </div>
        </>
      )}

      {s.step === 'extracting' && <AiWait label="Pulling out the decision and your options…" onSkip={() => send({ type: 'ai_fail', reason: null })} />}

      {s.step === 'review' && (
        <>
          <h1>The decision</h1>
          <AiNotice reason={s.notice} />
          <TextField label="The decision, as one question" value={d.decision} onChange={(decision) => edit({ decision })} />
          <ListField label="Your options" itemLabel="Option" min={2} max={4} values={d.options} onChange={(o) => edit({ options: o })} />
          <ListField label="What you don't know yet" itemLabel="Unknown" min={1} max={3} values={d.unknowns} onChange={(unknowns) => edit({ unknowns })} />
          <AreaSelect value={d.lifeArea} onChange={(lifeArea) => edit({ lifeArea })} />
          <div className="actions">
            <IonButton expand="block" disabled={!canLeaveReview(d)} onClick={next}>
              Next
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'questions' && (
        <>
          <h1>Three questions</h1>
          <p className="muted">Answer honestly. The answers, not your mood, decide what happens next.</p>
          {(['q1', 'q2', 'q3'] as const).map((q) => (
            <section key={q}>
              <h2 id={`falkland-${q}`}>{QUESTIONS[q]}</h2>
              <IonList aria-labelledby={`falkland-${q}`}>
                <IonRadioGroup value={yesNo(d[q])} onIonChange={(e) => edit({ [q]: e.detail.value === 'yes' })}>
                  <IonItem>
                    <IonRadio value="yes">Yes</IonRadio>
                  </IonItem>
                  <IonItem>
                    <IonRadio value="no">No</IonRadio>
                  </IonItem>
                </IonRadioGroup>
              </IonList>
            </section>
          ))}
          <div className="actions">
            <IonButton expand="block" disabled={d.q1 === null || d.q2 === null || d.q3 === null} onClick={next}>
              See the verdict
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'finding' && <AiWait label="Working out what to find out first…" onSkip={() => send({ type: 'ai_fail', reason: null })} />}

      {s.step === 'park' && (
        <>
          <h1>{VERDICT_COPY.park.title}</h1>
          <p>{VERDICT_COPY.park.body}</p>
          <AiNotice reason={s.notice} />
          <ListField label="Find out before you decide" itemLabel="Thing to find out" max={3} values={d.findOut} onChange={(findOut) => edit({ findOut })} />
          <TextField label="Come back to it on" type="date" value={d.revisitOn ?? ''} onChange={(v) => edit({ revisitOn: v || null })} />
          <SaveError show={saveError} />
          <div className="actions">
            <IonButton expand="block" disabled={!canPark(d)} onClick={save}>
              Park it
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'decide' && d.verdict && d.verdict !== 'park' && (
        <>
          <h1>{VERDICT_COPY[d.verdict].title}</h1>
          <p>{VERDICT_COPY[d.verdict].body}</p>
          <h2 id="falkland-choice">Which one?</h2>
          <IonList aria-labelledby="falkland-choice">
            <IonRadioGroup value={d.choice ?? undefined} onIonChange={(e) => edit({ choice: e.detail.value as string })}>
              {options.map((o) => (
                <IonItem key={o}>
                  <IonRadio value={o}>
                    <span className="hand">{o}</span>
                  </IonRadio>
                </IonItem>
              ))}
            </IonRadioGroup>
          </IonList>
          <TextField label="What do you expect to happen?" multiline value={d.expectedOutcome ?? ''} onChange={(expectedOutcome) => edit({ expectedOutcome })} />
          <TextField label="Check how it went on" type="date" helper="Optional. Comparing what you expected with what happened sharpens your next call." value={d.reviewOn ?? ''} onChange={(v) => edit({ reviewOn: v || null })} />
          <SaveError show={saveError} />
          <div className="actions">
            <IonButton expand="block" disabled={!canDecide(d)} onClick={save}>
              Save decision
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'saved' && (
        <>
          <h1>{d.verdict === 'park' ? 'Parked.' : 'Decided.'}</h1>
          <p className="hand">{d.decision}</p>
          {d.verdict === 'park' ? (
            <p>{d.revisitOn && `Come back on ${formatDay(d.revisitOn)} with what you've found out, and decide then.`}</p>
          ) : (
            <p>
              You chose <span className="hand">{d.choice}</span>. {d.reviewOn && `Check how it went on ${formatDay(d.reviewOn)}.`}
            </p>
          )}
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
