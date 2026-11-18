import { IonButton, IonItem, IonToggle } from '@ionic/react';
import { useState } from 'react';
import { aiAvailable, runStepEvent } from '../ai/runStep';
import { AiNotice, AiWait, AreaSelect, ListField, SaveError, TextField } from '../components/form';
import Page from '../components/Page';
import { SELF_CHECK, SHELF_INTRO } from '../content/tools';
import { today } from '../lib/dates';
import { filled, highlightParts } from '../lib/text';
import { usePipeline } from '../pipelines/usePipeline';
import { initWilson, type LearningDraft, saveLearning, TOPIC_MAX, wilson } from '../pipelines/wilson';
import { usePrefill } from '../lib/usePrefill';
import { useProfile } from '../store/profile';

export default function WilsonTool() {
  const area = useProfile((s) => s.profile?.areas[0] ?? 'other');
  const [s, send] = usePipeline(wilson, initWilson(area));
  const { prefill, link } = usePrefill();
  const [typed, setText] = useState<string | null>(null);
  const text = typed ?? prefill?.text ?? '';
  const [saveError, setSaveError] = useState(false);
  const d = s.draft;
  const edit = (patch: Partial<LearningDraft>) => send({ type: 'edit', patch });
  const skip = () => send({ type: 'ai_fail', reason: null });

  async function submit() {
    if (prefill) edit({ lifeArea: prefill.lifeArea });
    const n = send({ type: 'submit', text, ai: aiAvailable() });
    if (n.step === 'extracting') send(await runStepEvent('extract_learning', { text: text.trim() }));
  }

  async function next() {
    const n = send({ type: 'next', ai: aiAvailable() });
    if (n.step === 'questioning') {
      send(await runStepEvent('beginner_questions', { topic: n.draft.topic.trim(), assumptions: filled(n.draft.assumptions) }));
    } else if (n.step === 'reviewing') {
      send(await runStepEvent('review_explanation', { topic: n.draft.topic.trim(), explanation: n.draft.explanation.trim() }));
    }
  }

  async function save() {
    setSaveError(false);
    try {
      const saved = await saveLearning(d, today());
      await link('learning_entries', saved.id);
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
    <Page title="The shelf" backHref="/tabs/laws/wilson">
      {s.step === 'input' && (
        <>
          <h1>What are you learning?</h1>
          <p className="muted">Say what it is and how you feel about it. What do you already think you know?</p>
          <TextField label="What you're learning" multiline maxlength={1000} value={text} onChange={setText} placeholder="I'm trying to understand…" />
          <div className="actions">
            <IonButton expand="block" disabled={!text.trim()} onClick={submit}>
              Next
            </IonButton>
          </div>
        </>
      )}

      {s.step === 'extracting' && <AiWait label="Finding the beliefs you're bringing in…" onSkip={skip} />}

      {s.step === 'shelf' && (
        <>
          <h1>On the shelf</h1>
          <AiNotice reason={s.notice} />
          <p className="muted">{SHELF_INTRO}</p>
          <TextField label="Topic" maxlength={TOPIC_MAX} value={d.topic} onChange={(topic) => edit({ topic })} />
          <ListField label="What I already believe about it" itemLabel="Belief" max={3} values={d.assumptions} onChange={(assumptions) => edit({ assumptions })} />
          <TextField label="The question I'm scared to ask" value={d.scaryQuestion} onChange={(scaryQuestion) => edit({ scaryQuestion })} placeholder="Ask it anyway" />
          <AreaSelect value={d.lifeArea} onChange={(lifeArea) => edit({ lifeArea })} />
          <div className="actions">
            <IonButton expand="block" disabled={!d.topic.trim()} onClick={next}>
              Next
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'questioning' && <AiWait label="Asking like a complete beginner…" onSkip={skip} />}

      {s.step === 'questions' && (
        <>
          <h1>Beginner's questions</h1>
          <AiNotice reason={s.notice} />
          <p className="muted">Questions a complete beginner would ask, even if they feel obvious. Find the answers before you move on.</p>
          <ListField label="Beginner's questions" itemLabel="Question" min={3} max={3} values={d.beginnerQuestions} onChange={(beginnerQuestions) => edit({ beginnerQuestions })} />
          <div className="actions">
            <IonButton expand="block" onClick={next}>
              I've looked into these
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'explain' && (
        <>
          <h1>Explain it in plain words</h1>
          <p className="muted">As if to a friend who has never heard of {d.topic.trim() || 'it'}. Wherever it turns vague is where your understanding stops.</p>
          <TextField label="Your explanation" multiline maxlength={3000} value={d.explanation} onChange={(explanation) => edit({ explanation })} />
          <div className="actions">
            <IonButton expand="block" disabled={!d.explanation.trim()} onClick={next}>
              Check my explanation
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'reviewing' && <AiWait label="Reading your explanation…" onSkip={skip} />}

      {s.step === 'reflect' && (
        <>
          <h1>{d.review ? 'Where it turns vague' : 'Check your explanation'}</h1>
          <AiNotice reason={s.notice} />
          {d.review ? (
            <>
              <p className="hand">
                {highlightParts(d.explanation, d.review.vagueParts).map((p, i) =>
                  p.mark ? (
                    <mark key={i} className="highlight">
                      {p.text}
                    </mark>
                  ) : (
                    <span key={i}>{p.text}</span>
                  ),
                )}
              </p>
              {d.review.vagueParts.length === 0 && <p>Nothing vague stood out. Nice and clear.</p>}
              {d.review.jargonTerms.length > 0 && (
                <>
                  <h2>Words to explain</h2>
                  <ul>
                    {d.review.jargonTerms.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </>
              )}
              <h2>The gap</h2>
              <p>{d.review.gapQuestion}</p>
            </>
          ) : (
            <>
              <p className="hand">{d.explanation}</p>
                            <ul>
                {SELF_CHECK.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
          <TextField label="What did you learn?" multiline value={d.learned} onChange={(learned) => edit({ learned })} />
          <IonItem lines="none">
            <IonToggle checked={d.changedMind} onIonChange={(e) => edit({ changedMind: e.detail.checked })}>
              This changed one of my beliefs
            </IonToggle>
          </IonItem>
          <SaveError show={saveError} />
          <div className="actions">
            <IonButton expand="block" onClick={save}>
              Save to my journal
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => send({ type: 'back' })}>
              Rewrite my explanation
            </IonButton>
          </div>
        </>
      )}

      {s.step === 'saved' && (
        <>
          <h1>Saved.</h1>
          <p>
            {d.changedMind
              ? 'You changed your mind about something. That is the whole point.'
              : 'Take your beliefs back off the shelf and check whether they still fit.'}
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
