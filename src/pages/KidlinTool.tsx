import { IonButton } from '@ionic/react';
import { useState } from 'react';
import { aiAvailable, runStepEvent } from '../ai/runStep';
import { AiNotice, AiWait, AreaSelect, ListField, SaveError, TextField } from '../components/form';
import Page from '../components/Page';
import { problems } from '../db/repos';
import { canSaveProblem, finishProblem, initKidlin, kidlin, type ProblemDraft } from '../pipelines/kidlin';
import { usePipeline } from '../pipelines/usePipeline';
import { useProfile } from '../store/profile';

export default function KidlinTool() {
  const area = useProfile((s) => s.profile?.areas[0] ?? 'other');
  const [s, send] = usePipeline(kidlin, initKidlin(area));
  const [text, setText] = useState('');
  const [saveError, setSaveError] = useState(false);
  const d = s.draft;
  const edit = (patch: Partial<ProblemDraft>) => send({ type: 'edit', patch });
  const skip = () => send({ type: 'ai_fail', reason: null });

  async function submit() {
    const n = send({ type: 'submit', text, ai: aiAvailable() });
    if (n.step === 'clarifying') send(await runStepEvent('clarify_problem', { rant: n.draft.rant }));
  }

  async function next() {
    const n = send({ type: 'next', ai: aiAvailable() });
    if (n.step === 'structuring') {
      send(await runStepEvent('structure_problem', { rant: n.draft.rant, answers: n.draft.clarifyQA.map(({ q, a }) => ({ q, a: a.trim() })) }));
    }
  }

  async function save() {
    setSaveError(false);
    try {
      send({ type: 'saved', id: (await problems.create(finishProblem(d))).id });
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
    <Page title="Problem page" backHref="/tabs/laws/kidlin">
      {s.step === 'input' && (
        <>
          <h1>What's the problem?</h1>
          <p className="muted">Rant first. Don't tidy it up; that comes next.</p>
          <TextField label="Your rant" multiline maxlength={2000} value={text} onChange={setText} placeholder="The thing that keeps going wrong is…" />
          <div className="actions">
            <IonButton expand="block" disabled={!text.trim()} onClick={submit}>
              Next
            </IonButton>
          </div>
        </>
      )}

      {s.step === 'clarifying' && <AiWait label="Thinking of a few plain questions…" onSkip={skip} />}

      {s.step === 'clarify' && (
        <>
          <h1>A few questions</h1>
          <p className="muted">Short answers are fine. Skip any that don't fit.</p>
          {d.clarifyQA.map((x, i) => (
            <TextField key={x.q} label={x.q} multiline maxlength={1000} value={x.a} onChange={(a) => send({ type: 'answer', index: i, a })} />
          ))}
          <div className="actions">
            <IonButton expand="block" onClick={next}>
              Write it down
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'structuring' && <AiWait label="Writing your problem page…" onSkip={skip} />}

      {s.step === 'review' && (
        <>
          <h1>Your problem page</h1>
          <AiNotice reason={s.notice} />
          <p className="muted">Your words:</p>
          <p className="hand">{d.rant}</p>
          <TextField label="What is actually happening" multiline value={d.whatIsHappening} onChange={(whatIsHappening) => edit({ whatIsHappening })} />
          <TextField label="What solved looks like" multiline value={d.solvedLooksLike} onChange={(solvedLooksLike) => edit({ solvedLooksLike })} />
          <TextField label="The part in my control" multiline value={d.inMyControl} onChange={(inMyControl) => edit({ inMyControl })} />
          <TextField label="Next step (twenty minutes or less)" value={d.nextStep} onChange={(nextStep) => edit({ nextStep })} placeholder="Start with a verb" />
          <ListField label="Tags" itemLabel="Tag" max={3} values={d.tags} onChange={(tags) => edit({ tags })} placeholder="e.g. group project" />
          <AreaSelect value={d.lifeArea} onChange={(lifeArea) => edit({ lifeArea })} />
          <SaveError show={saveError} />
          <div className="actions">
            <IonButton expand="block" disabled={!canSaveProblem(d)} onClick={save}>
              Save problem page
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'saved' && (
        <>
          <h1>Written down.</h1>
          <p>That's half of it. Now the other half:</p>
          <p>
            <mark className="highlight">{d.nextStep}</mark>
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
