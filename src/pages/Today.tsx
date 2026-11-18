import { IonButton, IonTextarea } from '@ionic/react';
import { useState } from 'react';
import Page from '../components/Page';

const today = () =>
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Today() {
  const [text, setText] = useState('');

  return (
    <Page title="Today">
      <p className="numeral">{today()}</p>
      <h1>What's on your mind?</h1>
      <IonTextarea
        className="paper-input"
        label="Your check-in"
        labelPlacement="stacked"
        fill="outline"
        autoGrow
        rows={4}
        maxlength={1000}
        placeholder="A worry, a problem, a choice, something you're learning…"
        value={text}
        onIonInput={(e) => setText(e.detail.value ?? '')}
      />
      {/* Milestone 6 replaces this with the check-in router. */}
      <IonButton expand="block" className="ion-margin-top" routerLink="/tabs/laws" disabled={!text.trim()}>
        Pick a chapter for this
      </IonButton>

      <h2>Follow-ups</h2>
      <p className="empty">
        Nothing is due. Fears you log and decisions you park will come back here on the day they need you.
      </p>
    </Page>
  );
}
