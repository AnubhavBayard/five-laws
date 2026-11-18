import { IonBadge, IonButton, IonItem, IonLabel, IonList, useIonRouter } from '@ionic/react';
import type { Law } from '@shared/laws';
import { useState } from 'react';
import { aiAvailable, runStepEvent } from '../ai/runStep';
import { AiWait, SaveError, TextField } from '../components/form';
import Page from '../components/Page';
import { chapterFor } from '../content/chapters';
import { checkins } from '../db/repos';
import { INITIAL_ROUTER, lawChoices, MIN_CONFIDENCE, router as routerReducer } from '../pipelines/router';
import { usePipeline } from '../pipelines/usePipeline';
import { useProfile } from '../store/profile';

const todayLabel = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

const TAG_LABEL = { suggested: 'Suggested', also: 'Also fits' } as const;

export default function Today() {
  const area = useProfile((s) => s.profile?.areas[0] ?? 'other');
  const nav = useIonRouter();
  const [s, send] = usePipeline(routerReducer, INITIAL_ROUTER);
  const [text, setText] = useState('');
  const [saveError, setSaveError] = useState(false);

  async function submit() {
    setSaveError(false);
    let id: string;
    try {
      const c = await checkins.create({
        text: text.trim(),
        lifeArea: area,
        cleanedText: null,
        suggestedPrimary: null,
        suggestedSecondary: null,
        confidence: null,
        chosenLaw: null,
        entryTable: null,
        entryId: null,
      });
      id = c.id;
    } catch {
      setSaveError(true);
      return;
    }
    const n = send({ type: 'submit', checkinId: id, ai: aiAvailable() });
    if (n.step !== 'routing') return;
    const ev = await runStepEvent('route_checkin', { text: text.trim() });
    if (ev.type === 'ai_ok') {
      const o = ev.output;
      await checkins
        .update(id, {
          cleanedText: o.cleanedText,
          suggestedPrimary: o.primaryLaw,
          suggestedSecondary: o.secondaryLaw === o.primaryLaw ? null : o.secondaryLaw,
          confidence: o.confidence,
          lifeArea: o.lifeArea,
        })
        .catch(() => undefined); // The suggestion still shows; only the record of it is lost.
    }
    send(ev);
  }

  async function choose(law: Law) {
    const id = s.checkinId;
    if (!id) return;
    await checkins.update(id, { chosenLaw: law }).catch(() => undefined);
    send({ type: 'reset' });
    setText('');
    nav.push(`/tabs/laws/${law}/new?checkin=${id}`);
  }

  function notNow() {
    send({ type: 'reset' });
    setText('');
  }

  const confident = !!s.suggestion && s.suggestion.confidence >= MIN_CONFIDENCE;

  return (
    <Page title="Today">
      <p className="numeral">{todayLabel()}</p>

      {s.step === 'input' && (
        <>
          <h1>What's on your mind?</h1>
          <TextField
            label="Your check-in"
            multiline
            maxlength={1000}
            placeholder="A worry, a problem, a choice, something you're learning…"
            value={text}
            onChange={setText}
          />
          <SaveError show={saveError} />
          <div className="actions">
            <IonButton expand="block" disabled={!text.trim()} onClick={submit}>
              Find the right tool
            </IonButton>
          </div>
        </>
      )}

      {s.step === 'routing' && <AiWait label="Reading your check-in…" onSkip={() => send({ type: 'ai_fail', reason: null })} />}

      {s.step === 'choose' && (
        <>
          <h1>{confident ? 'This sounds like a job for…' : 'Which tool fits?'}</h1>
          <p className="hand">{text}</p>
          <IonList lines="full" aria-label="Tools">
            {lawChoices(s.suggestion).map(({ law, tag }) => {
              const c = chapterFor(law);
              return c ? (
                <IonItem key={law} button detail onClick={() => void choose(law)}>
                  <IonLabel className="ion-text-wrap">
                    <h2>{c.toolName}</h2>
                    <p>
                      {c.name} · {c.theme}
                    </p>
                  </IonLabel>
                  {tag && (
                    <IonBadge slot="end" className="tag-badge">
                      {TAG_LABEL[tag]}
                    </IonBadge>
                  )}
                </IonItem>
              ) : null;
            })}
          </IonList>
          <div className="actions">
            <IonButton expand="block" fill="clear" onClick={notNow}>
              Just keep it as a note
            </IonButton>
          </div>
        </>
      )}

      <h2>Follow-ups</h2>
      <p className="empty">
        Nothing is due. Fears you log and decisions you park will come back here on the day they need you.
      </p>
    </Page>
  );
}
