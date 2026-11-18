import { IonButton, IonItem, IonRadio, IonRadioGroup, useIonViewWillEnter } from '@ionic/react';
import { useCallback, useState } from 'react';
import type { Decision, Fear } from '../db/entities';
import { decisions, fears } from '../db/repos';
import { formatDay, today } from '../lib/dates';
import { rescheduleAll } from '../notifications/schedule';
import { decideParked, dueFollowUps, type FollowUp, parkAgain, recordOutcome, reviewDecision } from '../pipelines/followups';
import { SaveError, TextField } from './form';

type Act = (fn: () => Promise<unknown>) => Promise<void>;

/** What's due today: fear outcomes, parked decisions and decision reviews. The same actions as the notification buttons. */
export default function FollowUps() {
  const [items, setItems] = useState<FollowUp[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(dueFollowUps(await fears.list(), await decisions.list(), today()));
    } catch {
      setItems([]);
    }
  }, []);
  useIonViewWillEnter(() => void load());

  const act: Act = async (fn) => {
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
      return;
    }
    await rescheduleAll();
    await load();
  };

  if (items === null) return null;
  return (
    <section aria-labelledby="followups-h">
      <h2 id="followups-h">Follow-ups</h2>
      <SaveError show={error} />
      {items.length === 0 ? (
        <p className="empty">Nothing is due. Fears you log and decisions you park will come back here on the day they need you.</p>
      ) : (
        items.map((x) =>
          x.kind === 'fear' ? (
            <FearCard key={x.fear.id} fear={x.fear} due={x.due} act={act} />
          ) : x.kind === 'revisit' ? (
            <RevisitCard key={x.decision.id} d={x.decision} act={act} />
          ) : (
            <ReviewCard key={x.decision.id} d={x.decision} act={act} />
          ),
        )
      )}
    </section>
  );
}

function FearCard({ fear, due, act }: { fear: Fear; due: string; act: Act }) {
  const outcomes = [
    ['happened', 'It happened'],
    ['partly', 'Partly'],
    ['didnt', "It didn't"],
  ] as const;
  return (
    <article className="followup">
      <p className="numeral">Fear forecast · {formatDay(due)}</p>
      <p className="hand">{fear.fear}</p>
      <p>You gave it {fear.likelihood}%. What actually happened?</p>
      <div className="followup-buttons">
        {outcomes.map(([o, label]) => (
          <IonButton key={o} size="small" fill="outline" onClick={() => void act(() => recordOutcome(fear.id, o))}>
            {label}
          </IonButton>
        ))}
      </div>
    </article>
  );
}

function RevisitCard({ d, act }: { d: Decision; act: Act }) {
  const [deciding, setDeciding] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [expected, setExpected] = useState('');
  const groupId = `revisit-${d.id}`;
  return (
    <article className="followup">
      <p className="numeral">Parked decision</p>
      <p className="hand">{d.decision}</p>
      {d.findOut.length > 0 && (
        <>
          <p>You meant to find out:</p>
          <ul>
            {d.findOut.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </>
      )}
      {d.postponeCount >= 2 && <p className="notice">Parked {d.postponeCount} times already. Is waiting still bringing you new facts?</p>}
      {deciding ? (
        <>
          <p id={groupId}>Which one?</p>
          <IonRadioGroup aria-labelledby={groupId} value={choice ?? undefined} onIonChange={(e) => setChoice(e.detail.value as string)}>
              {d.options.map((o) => (
                <IonItem key={o}>
                  <IonRadio value={o}>
                    <span className="hand">{o}</span>
                  </IonRadio>
                </IonItem>
              ))}
            </IonRadioGroup>
          <TextField label="What do you expect to happen?" multiline value={expected} onChange={setExpected} />
          <div className="followup-buttons">
            <IonButton size="small" disabled={!choice} onClick={() => choice && void act(() => decideParked(d.id, choice, expected))}>
              Save decision
            </IonButton>
            <IonButton size="small" fill="clear" onClick={() => setDeciding(false)}>
              Cancel
            </IonButton>
          </div>
        </>
      ) : (
        <div className="followup-buttons">
          <IonButton size="small" onClick={() => setDeciding(true)}>
            Decide now
          </IonButton>
          <IonButton size="small" fill="outline" onClick={() => void act(() => parkAgain(d.id, today()))}>
            Park another week
          </IonButton>
        </div>
      )}
    </article>
  );
}

function ReviewCard({ d, act }: { d: Decision; act: Act }) {
  const [actual, setActual] = useState('');
  return (
    <article className="followup">
      <p className="numeral">Decision review</p>
      <p className="hand">{d.decision}</p>
      <p>
        You chose <span className="hand">{d.choice}</span>.{d.expectedOutcome && <> You expected: <span className="hand">{d.expectedOutcome}</span></>}
      </p>
      <TextField label="What actually happened?" multiline value={actual} onChange={setActual} />
      <div className="followup-buttons">
        <IonButton size="small" disabled={!actual.trim()} onClick={() => void act(() => reviewDecision(d.id, actual))}>
          Save
        </IonButton>
      </div>
    </article>
  );
}
