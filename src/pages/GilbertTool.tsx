import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';
import { IonButton, IonItem, IonList, IonRadio, IonRadioGroup } from '@ionic/react';
import { useState } from 'react';
import { aiAvailable, runStepEvent } from '../ai/runStep';
import { AiNotice, AiWait, AreaSelect, ListField, SaveError, TextField } from '../components/form';
import Page from '../components/Page';
import { RECIPIENT_LABEL } from '../content/labels';
import type { Brief } from '../db/entities';
import { briefs } from '../db/repos';
import {
  type BriefDraft,
  canLeaveBrief,
  canSaveGoal,
  canSaveMessage,
  finishBrief,
  gilbert,
  initGilbert,
  messageInput,
  type Recipient,
} from '../pipelines/gilbert';
import { usePipeline } from '../pipelines/usePipeline';
import { usePrefill } from '../lib/usePrefill';
import { useProfile } from '../store/profile';

const RECIPIENTS = Object.keys(RECIPIENT_LABEL) as Recipient[];

export default function GilbertTool() {
  const area = useProfile((s) => s.profile?.areas[0] ?? 'other');
  const [s, send] = usePipeline(gilbert, initGilbert(area));
  const [mode, setMode] = useState<Brief['mode']>('brief');
  const { prefill, link } = usePrefill();
  const [typed, setText] = useState<string | null>(null);
  const text = typed ?? prefill?.text ?? '';
  const [saveError, setSaveError] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const d = s.draft;
  const edit = (patch: Partial<BriefDraft>) => send({ type: 'edit', patch });
  const skip = () => send({ type: 'ai_fail', reason: null });

  async function submit() {
    if (prefill) edit({ lifeArea: prefill.lifeArea, sourceProblemId: prefill.problemId });
    const n = send({ type: 'submit', text, mode, ai: aiAvailable() });
    if (n.step === 'building') send(await runStepEvent('build_brief', { text: n.draft.taskAsGiven }));
    else if (n.step === 'breaking') send(await runStepEvent('break_goal', { goal: n.draft.taskAsGiven }));
  }

  async function next() {
    const n = send({ type: 'next', ai: aiAvailable() });
    if (n.step === 'drafting' && n.draft.recipient) {
      send(await runStepEvent('draft_clarifying_message', messageInput({ ...n.draft, recipient: n.draft.recipient })));
    }
  }

  async function save() {
    setSaveError(false);
    try {
      const saved = await briefs.create(finishBrief(d));
      await link('briefs', saved.id);
      send({ type: 'saved', id: saved.id });
    } catch {
      setSaveError(true);
    }
  }

  async function copy() {
    try {
      await Clipboard.write({ string: d.message ?? '' });
      setSent('Copied. Paste it wherever you talk to them.');
    } catch {
      setSent("Couldn't copy here. Select the message and copy it yourself.");
    }
  }

  async function share() {
    try {
      await Share.share({ text: d.message ?? '' });
    } catch {
      await copy(); // No share sheet here (or it was closed): copying still gets the message out.
    }
  }

  const back = (
    <IonButton expand="block" fill="clear" onClick={() => send({ type: 'back' })}>
      Back
    </IonButton>
  );

  return (
    <Page title="Brief builder" backHref="/tabs/laws/gilbert">
      {s.step === 'input' && (
        <>
          <h1>What do you need to do?</h1>
          <h2 id="gilbert-mode">What kind is it?</h2>
          <IonList aria-labelledby="gilbert-mode">
            <IonRadioGroup value={mode} onIonChange={(e) => setMode(e.detail.value as Brief['mode'])}>
              <IonItem>
                <IonRadio value="brief">Someone gave me a task and it's unclear</IonRadio>
              </IonItem>
              <IonItem>
                <IonRadio value="goal">I have a big goal and no first step</IonRadio>
              </IonItem>
            </IonRadioGroup>
          </IonList>
          <TextField
            label={mode === 'brief' ? 'The task, as you were told it' : 'Your goal'}
            multiline
            maxlength={1000}
            value={text}
            onChange={setText}
            placeholder={mode === 'brief' ? 'They said I should…' : 'I want to…'}
          />
          <div className="actions">
            <IonButton expand="block" disabled={!text.trim()} onClick={submit}>
              Next
            </IonButton>
          </div>
        </>
      )}

      {s.step === 'building' && <AiWait label="Working out what's missing from the task…" onSkip={skip} />}

      {s.step === 'brief' && (
        <>
          <h1>Your brief</h1>
          <AiNotice reason={s.notice} />
          <TextField label="The task, as given" multiline value={d.taskAsGiven} onChange={(taskAsGiven) => edit({ taskAsGiven })} />
          <TextField label="Done looks like" multiline value={d.doneLooksLike} onChange={(doneLooksLike) => edit({ doneLooksLike })} helper="As far as you know right now." />
          <TextField label="Deadline" value={d.deadline ?? ''} onChange={(v) => edit({ deadline: v })} helper="Leave it blank if nobody said." />
          <TextField label="Who signs it off" value={d.approver ?? ''} onChange={(v) => edit({ approver: v })} helper="Leave it blank if nobody said." />
          <ListField label="Questions to ask before you start" itemLabel="Question" max={3} values={d.openQuestions} onChange={(openQuestions) => edit({ openQuestions })} />
          <h2 id="gilbert-recipient">Who gave you the task?</h2>
          <IonList aria-labelledby="gilbert-recipient">
            <IonRadioGroup value={d.recipient ?? undefined} onIonChange={(e) => edit({ recipient: e.detail.value as Recipient })}>
              {RECIPIENTS.map((r) => (
                <IonItem key={r}>
                  <IonRadio value={r}>{RECIPIENT_LABEL[r]}</IonRadio>
                </IonItem>
              ))}
            </IonRadioGroup>
          </IonList>
          <AreaSelect value={d.lifeArea} onChange={(lifeArea) => edit({ lifeArea })} />
          <div className="actions">
            <IonButton expand="block" disabled={!canLeaveBrief(d)} onClick={next}>
              Write the message
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'drafting' && <AiWait label="Drafting your message…" onSkip={skip} />}

      {s.step === 'message' && (
        <>
          <h1>Your message</h1>
          <AiNotice reason={s.notice} />
          <p className="muted">Edit it so it sounds like you, then send it before you start.</p>
          <TextField label="Message" multiline maxlength={1500} value={d.message ?? ''} onChange={(message) => edit({ message })} />
          <div className="actions">
            <IonButton expand="block" fill="outline" disabled={!canSaveMessage(d)} onClick={copy}>
              Copy message
            </IonButton>
            <IonButton expand="block" fill="outline" disabled={!canSaveMessage(d)} onClick={share}>
              Share…
            </IonButton>
          </div>
          {sent && (
            <p className="muted" role="status">
              {sent}
            </p>
          )}
          <SaveError show={saveError} />
          <div className="actions">
            <IonButton expand="block" disabled={!canSaveMessage(d)} onClick={save}>
              Save brief
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'breaking' && <AiWait label="Breaking your goal into steps…" onSkip={skip} />}

      {s.step === 'goal' && (
        <>
          <h1>Your plan</h1>
          <AiNotice reason={s.notice} />
          <TextField label="Your goal" multiline value={d.taskAsGiven} onChange={(taskAsGiven) => edit({ taskAsGiven })} />
          <ListField label="Steps, in order" itemLabel="Step" min={2} max={5} values={d.subgoals} onChange={(subgoals) => edit({ subgoals })} />
          <TextField label="Next action, starting today" value={d.nextAction ?? ''} onChange={(nextAction) => edit({ nextAction })} placeholder="Start with a verb" />
          <AreaSelect value={d.lifeArea} onChange={(lifeArea) => edit({ lifeArea })} />
          <SaveError show={saveError} />
          <div className="actions">
            <IonButton expand="block" disabled={!canSaveGoal(d)} onClick={save}>
              Save plan
            </IonButton>
            {back}
          </div>
        </>
      )}

      {s.step === 'saved' && (
        <>
          <h1>Saved.</h1>
          {d.mode === 'brief' ? (
            <p>Send the message, and start once you have answers. Two minutes now saves two days of rework.</p>
          ) : (
            <p>
              Start here: <mark className="highlight">{d.nextAction}</mark>
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
