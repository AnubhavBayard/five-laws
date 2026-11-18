import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { IonButton, IonInput, IonItem, IonToggle, useIonAlert, useIonRouter } from '@ionic/react';
import { useRef, useState } from 'react';
import Page from '../components/Page';
import { AI_CONSENT } from '../content/ai';
import { deleteAll, exportAll, importAll, parseBackup } from '../db/backup';
import { today } from '../lib/dates';
import { rescheduleAll } from '../notifications/schedule';
import { useProfile } from '../store/profile';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function Settings() {
  const profile = useProfile((s) => s.profile);
  const save = useProfile((s) => s.save);
  const load = useProfile((s) => s.load);
  const [status, setStatus] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirm] = useIonAlert();
  const nav = useIonRouter();

  if (!profile) return null;
  const aiOn = profile.aiEnabled && !!profile.aiConsentAt;

  async function update(patch: Partial<typeof profile>, done: string) {
    if (!profile) return;
    try {
      await save({ ...profile, ...patch });
      void rescheduleAll();
      setStatus(done);
    } catch {
      setStatus("That didn't save. Try again.");
    }
  }

  async function exportJournal() {
    try {
      const text = JSON.stringify(await exportAll(), null, 2);
      const name = `five-laws-${today()}.json`;
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: name, text, dialogTitle: 'Save your journal backup' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      setStatus('Backup ready. Keep it somewhere private: it holds everything you wrote.');
    } catch {
      setStatus("Couldn't export this time. Nothing was changed.");
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const backup = parseBackup(await file.text());
    if (fileInput.current) fileInput.current.value = '';
    if (!backup) return setStatus("That file isn't a Five Laws backup, so nothing was changed.");
    void confirm({
      header: 'Replace everything?',
      message: `Everything on this phone will be replaced by the backup from ${new Date(backup.exportedAt).toLocaleDateString('en-GB')}.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Replace',
          role: 'destructive',
          handler: () =>
            void (async () => {
              try {
                await importAll(backup);
                await load();
                void rescheduleAll();
                setStatus('Backup restored.');
              } catch {
                setStatus("Couldn't restore that backup. Your journal is unchanged.");
              }
            })(),
        },
      ],
    });
  }

  function eraseEverything() {
    void confirm({
      header: 'Delete everything?',
      message: 'Every entry, check-in and setting on this phone is deleted for good. Export a backup first if you might want it back.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete everything',
          role: 'destructive',
          handler: () =>
            void (async () => {
              try {
                await deleteAll();
                await load();
                await rescheduleAll(); // no profile: cancels every reminder
                nav.push('/onboarding', 'root', 'replace');
              } catch {
                setStatus("Couldn't delete. Nothing was removed.");
              }
            })(),
        },
      ],
    });
  }

  return (
    <Page title="Settings" backHref="/tabs/today">
      {status && (
        <p className="notice" role="status">
          {status}
        </p>
      )}

      <h2>Daily check-in</h2>
      <IonItem>
        <IonInput
          type="time"
          label="Reminder time"
          value={profile.checkinTime}
          onIonChange={(e) => {
            const v = String(e.detail.value ?? '');
            if (TIME.test(v) && v !== profile.checkinTime) void update({ checkinTime: v }, `Reminders now come at ${v}.`);
          }}
        />
      </IonItem>

      <h2>{AI_CONSENT.title}</h2>
      <ul className="muted">
        {AI_CONSENT.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <IonItem>
        <IonToggle
          checked={aiOn}
          onIonChange={(e) =>
            void update(
              e.detail.checked ? { aiEnabled: true, aiConsentAt: new Date().toISOString() } : { aiEnabled: false },
              e.detail.checked ? 'AI help is on.' : 'AI help is off. Every tool still works by hand.',
            )
          }
        >
          {AI_CONSENT.toggle}
        </IonToggle>
      </IonItem>

      <h2>Your data</h2>
      <p className="muted">Your journal lives only on this phone. A backup is the only copy anywhere else.</p>
      <div className="actions">
        <IonButton expand="block" fill="outline" onClick={() => void exportJournal()}>
          Export a backup
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={() => fileInput.current?.click()}>
          Restore from a backup
        </IonButton>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(e) => void importFile(e.target.files?.[0])} />
        <IonButton expand="block" fill="clear" color="danger" onClick={eraseEverything}>
          Delete everything
        </IonButton>
      </div>
    </Page>
  );
}
