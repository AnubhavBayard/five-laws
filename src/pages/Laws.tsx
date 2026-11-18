import { IonItem, IonLabel, IonList } from '@ionic/react';
import Page from '../components/Page';
import { CHAPTERS } from '../content/chapters';

export default function Laws() {
  return (
    <Page srTitle title="Laws">
      <p className="muted">Five short chapters. Read one, then use its tool on your own life.</p>
      <IonList lines="full">
        {CHAPTERS.map((c) => (
          <IonItem key={c.law} routerLink={`/tabs/laws/${c.law}`} detail>
            <IonLabel className="ion-text-wrap">
              <p className="numeral">
                Chapter {c.numeral} · {c.theme}
              </p>
              <h2>{c.name}</h2>
              <p>{c.statement}</p>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </Page>
  );
}
