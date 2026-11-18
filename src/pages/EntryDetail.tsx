import { IonButton, useIonAlert, useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Page from '../components/Page';
import { SaveError } from '../components/form';
import { chapterFor } from '../content/chapters';
import { JOURNAL_TABLES, type JournalTable, REPO_FOR, TABLE_LAW } from '../db/journal';
import { problems } from '../db/repos';
import { entryFields } from '../lib/fields';
import { rescheduleAll } from '../notifications/schedule';

const isTable = (t: string | undefined): t is JournalTable => (JOURNAL_TABLES as readonly string[]).includes(t ?? '');

export default function EntryDetail() {
  const { table, id = '' } = useParams();
  const [entry, setEntry] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [confirm] = useIonAlert();
  const nav = useIonRouter();

  const load = () => {
    if (!isTable(table)) return setEntry(null);
    (REPO_FOR[table].get(id) as Promise<Record<string, unknown> | null>).then(setEntry).catch(() => setEntry(null));
  };
  useIonViewWillEnter(load);

  if (!isTable(table) || entry === null) {
    return (
      <Page title="Entry" backHref="/tabs/journal">
        <p className="empty">This entry isn't here any more.</p>
      </Page>
    );
  }
  if (entry === undefined) return <Page title="Entry" backHref="/tabs/journal">{null}</Page>;

  const law = TABLE_LAW[table];
  const title = law ? (chapterFor(law)?.toolName ?? 'Entry') : 'Note';

  async function run(fn: () => Promise<unknown>, after: () => void) {
    setError(false);
    try {
      await fn();
      void rescheduleAll();
      after();
    } catch {
      setError(true);
    }
  }

  function remove() {
    if (!isTable(table)) return;
    void confirm({
      header: 'Delete this entry?',
      message: "It's removed from this phone for good. There's no undo.",
      buttons: [
        { text: 'Keep it', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => void run(() => REPO_FOR[table].remove(id), () => nav.push('/tabs/journal', 'back', 'pop')) },
      ],
    });
  }

  return (
    <Page title={title} backHref="/tabs/journal">
      <p className="numeral">{new Date(String(entry.createdAt)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <dl className="fields">
        {entryFields(table, entry).map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd className="hand">
              {Array.isArray(f.value) ? (
                <ul>
                  {f.value.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              ) : (
                f.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <SaveError show={error} />
      <div className="actions">
        {table === 'problems' && entry.status === 'open' && (
          <IonButton expand="block" onClick={() => void run(() => problems.update(id, { status: 'resolved', resolvedAt: new Date().toISOString() }), load)}>
            Mark as solved
          </IonButton>
        )}
        <IonButton expand="block" fill="clear" color="danger" onClick={remove}>
          Delete entry
        </IonButton>
      </div>
    </Page>
  );
}
