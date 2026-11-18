import { IonItem, IonLabel, IonList, IonSearchbar, IonSelect, IonSelectOption, useIonViewWillEnter } from '@ionic/react';
import { LAWS, LIFE_AREAS, type LifeArea } from '@shared/laws';
import { useState } from 'react';
import Page from '../components/Page';
import { chapterFor } from '../content/chapters';
import { LIFE_AREA_LABEL } from '../content/labels';
import { filterJournal, type JournalFilter, type JournalItem, loadJournal } from '../db/journal';

const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Journal() {
  const [items, setItems] = useState<JournalItem[] | null>(null);
  const [f, setF] = useState<JournalFilter>({ law: null, area: null, q: '' });

  useIonViewWillEnter(() => {
    loadJournal()
      .then(setItems)
      .catch(() => setItems([]));
  });

  const shown = items ? filterJournal(items, f) : [];

  return (
    <Page srTitle title="Journal">
      {items !== null && items.length === 0 ? (
        <p className="empty">Your journal is empty. Everything you write in a chapter lands here, newest first.</p>
      ) : (
        <>
          <IonSearchbar aria-label="Search your journal" placeholder="Search your words" value={f.q} debounce={150} onIonInput={(e) => setF({ ...f, q: e.detail.value ?? '' })} />
          <div className="filters">
            <IonSelect label="Tool" interface="popover" value={f.law ?? 'all'} onIonChange={(e) => setF({ ...f, law: e.detail.value === 'all' ? null : (e.detail.value as JournalFilter['law']) })}>
              <IonSelectOption value="all">All</IonSelectOption>
              {LAWS.map((l) => (
                <IonSelectOption key={l} value={l}>
                  {chapterFor(l)?.toolName}
                </IonSelectOption>
              ))}
              <IonSelectOption value="notes">Notes</IonSelectOption>
            </IonSelect>
            <IonSelect label="Part of life" interface="popover" value={f.area ?? 'all'} onIonChange={(e) => setF({ ...f, area: e.detail.value === 'all' ? null : (e.detail.value as LifeArea) })}>
              <IonSelectOption value="all">All</IonSelectOption>
              {LIFE_AREAS.map((a) => (
                <IonSelectOption key={a} value={a}>
                  {LIFE_AREA_LABEL[a]}
                </IonSelectOption>
              ))}
            </IonSelect>
          </div>
          {items !== null && shown.length === 0 && <p className="empty">Nothing matches. Try fewer words or a wider filter.</p>}
          <IonList lines="full">
            {shown.map((i) => (
              <IonItem key={`${i.table}:${i.id}`} routerLink={`/tabs/journal/${i.table}/${i.id}`} detail>
                <IonLabel className="ion-text-wrap">
                  <p className="numeral">
                    {(i.law && chapterFor(i.law)?.toolName) ?? 'Note'} · {when(i.createdAt)}
                  </p>
                  <h2 className="hand">{i.title}</h2>
                  <p>{i.status}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </>
      )}
    </Page>
  );
}
