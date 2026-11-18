import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';

/** `srTitle`: the page has no visible h1, so give screen readers one with the toolbar title. */
type Props = { title: string; backHref?: string; end?: ReactNode; srTitle?: boolean; children: ReactNode };

export default function Page({ title, backHref, end, srTitle, children }: Props) {
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
        <div className="page">
          {srTitle && <h1 className="sr-only">{title}</h1>}
          {children}
        </div>
      </IonContent>
    </IonPage>
  );
}
