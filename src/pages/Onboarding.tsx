import { LocalNotifications } from '@capacitor/local-notifications';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonToggle,
  useIonRouter,
} from '@ionic/react';
import { LIFE_AREAS, LIFE_STAGES, type LifeArea, type LifeStage } from '@shared/laws';
import { useState } from 'react';
import { AI_CONSENT } from '../content/ai';
import { LIFE_AREA_LABEL, LIFE_STAGE_LABEL } from '../content/labels';
import { useProfile } from '../store/profile';

async function askNotificationPermission() {
  try {
    await LocalNotifications.requestPermissions();
  } catch {
    // Browser without notification support: reminders just stay off.
  }
}

export default function Onboarding() {
  const save = useProfile((s) => s.save);
  const router = useIonRouter();
  const [lifeStage, setLifeStage] = useState<LifeStage | null>(null);
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [checkinTime, setCheckinTime] = useState('21:00');
  const [useAi, setUseAi] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleArea = (a: LifeArea, on: boolean) =>
    setAreas((prev) => (on ? [...prev, a] : prev.filter((x) => x !== a)));

  const ready = lifeStage !== null && areas.length > 0 && /^\d{2}:\d{2}$/.test(checkinTime);

  async function start() {
    if (!ready) return;
    setBusy(true);
    await askNotificationPermission();
    const now = new Date().toISOString();
    await save({
      lifeStage,
      areas,
      checkinTime,
      aiEnabled: useAi,
      aiConsentAt: useAi ? now : null,
      unloadReminder: false,
      onboardedAt: now,
    });
    router.push('/tabs/today', 'root', 'replace');
  }

  return (
    <IonPage>
      <IonContent>
        <main className="page">
          <p className="numeral">Before the first chapter</p>
          <h1>Five laws, written in your own hand.</h1>
          <p className="muted">Three quick questions so the examples fit your life, and one about AI help. Your journal stays on this phone.</p>

          <h2 id="stage-q">Where are you right now?</h2>
          <IonList aria-labelledby="stage-q">
            <IonRadioGroup value={lifeStage} onIonChange={(e) => setLifeStage(e.detail.value as LifeStage)}>
              {LIFE_STAGES.map((s) => (
                <IonItem key={s}>
                  <IonRadio value={s}>{LIFE_STAGE_LABEL[s]}</IonRadio>
                </IonItem>
              ))}
            </IonRadioGroup>
          </IonList>

          <h2 id="areas-q">What do you want to work on?</h2>
          <p className="muted">Pick as many as you like.</p>
          <IonList aria-labelledby="areas-q">
            {LIFE_AREAS.map((a) => (
              <IonItem key={a}>
                <IonCheckbox checked={areas.includes(a)} onIonChange={(e) => toggleArea(a, e.detail.checked)}>
                  {LIFE_AREA_LABEL[a]}
                </IonCheckbox>
              </IonItem>
            ))}
          </IonList>

          <h2>When should we check in?</h2>
          <p className="muted">One reminder a day. You can change it later.</p>
          <IonItem>
            <IonInput
              type="time"
              label="Daily check-in"
              value={checkinTime}
              onIonInput={(e) => setCheckinTime(e.detail.value ?? '')}
            />
          </IonItem>

          <h2>{AI_CONSENT.title}</h2>
          <ul className="muted">
            {AI_CONSENT.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <IonItem>
            <IonToggle checked={useAi} onIonChange={(e) => setUseAi(e.detail.checked)}>
              {AI_CONSENT.toggle}
            </IonToggle>
          </IonItem>

          <IonButton expand="block" className="ion-margin-top" disabled={!ready || busy} onClick={start}>
            Start writing
          </IonButton>
          <p className="muted" style={{ fontSize: '0.875rem' }}>
            We'll ask to send notifications next, only for your check-in and the follow-ups you set.
          </p>
        </main>
      </IonContent>
    </IonPage>
  );
}
