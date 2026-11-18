import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';

type Props = { title: string; backHref?: string; end?: ReactNode; children: ReactNode };

export default function Page({ title, backHref, end, children }: Props) {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          {backHref && (
            <IonButtons slot="start">
              <IonBackButton defaultHref={backHref} text="" aria-label="Back" />
            </IonButtons>
          )}
          <IonTitle className="display">{title}</IonTitle>
          {end && <IonButtons slot="end">{end}</IonButtons>}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="page">{children}</main>
      </IonContent>
    </IonPage>
  );
}
