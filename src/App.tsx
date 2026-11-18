import { IonApp, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { bookOutline, journalOutline, sparklesOutline, sunnyOutline } from 'ionicons/icons';
import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import Chapter from './pages/Chapter';
import Insights from './pages/Insights';
import Journal from './pages/Journal';
import Laws from './pages/Laws';
import Onboarding from './pages/Onboarding';
import Today from './pages/Today';
import { useProfile } from './store/profile';

function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useProfile((s) => s.profile);
  return profile ? children : <Navigate to="/onboarding" replace />;
}

function Tabs() {
  return (
    <RequireProfile>
      <IonTabs>
        <IonRouterOutlet>
          <Route path="/tabs/today" element={<Today />} />
          <Route path="/tabs/laws" element={<Laws />} />
          <Route path="/tabs/laws/:law" element={<Chapter />} />
          <Route path="/tabs/journal" element={<Journal />} />
          <Route path="/tabs/insights" element={<Insights />} />
          <Route path="/tabs" element={<Navigate to="/tabs/today" replace />} />
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="today" href="/tabs/today">
            <IonIcon aria-hidden="true" icon={sunnyOutline} />
            <IonLabel>Today</IonLabel>
          </IonTabButton>
          <IonTabButton tab="laws" href="/tabs/laws">
            <IonIcon aria-hidden="true" icon={bookOutline} />
            <IonLabel>Laws</IonLabel>
          </IonTabButton>
          <IonTabButton tab="journal" href="/tabs/journal">
            <IonIcon aria-hidden="true" icon={journalOutline} />
            <IonLabel>Journal</IonLabel>
          </IonTabButton>
          <IonTabButton tab="insights" href="/tabs/insights">
            <IonIcon aria-hidden="true" icon={sparklesOutline} />
            <IonLabel>Insights</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </RequireProfile>
  );
}

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/tabs/*" element={<Tabs />} />
          <Route path="*" element={<Navigate to="/tabs/today" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
