import { IonApp, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, useIonRouter } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { bookOutline, journalOutline, sparklesOutline, sunnyOutline } from 'ionicons/icons';
import { type ReactNode, useEffect } from 'react';
import { Navigate, Route } from 'react-router-dom';
import Chapter from './pages/Chapter';
import EntryDetail from './pages/EntryDetail';
import FalklandTool from './pages/FalklandTool';
import GilbertTool from './pages/GilbertTool';
import Insights from './pages/Insights';
import Journal from './pages/Journal';
import KidlinTool from './pages/KidlinTool';
import Laws from './pages/Laws';
import MurphyTool from './pages/MurphyTool';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import Today from './pages/Today';
import WilsonTool from './pages/WilsonTool';
import { useProfile } from './store/profile';
import { useDeepLink } from './store/ui';

function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useProfile((s) => s.profile);
  return profile ? children : <Navigate to="/onboarding" replace />;
}

/** Opens paths requested from outside React, e.g. a notification tap. */
function DeepLinks() {
  const path = useDeepLink((s) => s.path);
  const router = useIonRouter();
  useEffect(() => {
    if (!path) return;
    useDeepLink.getState().clear();
    router.push(path, 'root', 'replace');
  }, [path, router]);
  return null;
}

function Tabs() {
  return (
    <RequireProfile>
      <IonTabs>
        <IonRouterOutlet>
          <Route path="/tabs/today" element={<Today />} />
          <Route path="/tabs/laws" element={<Laws />} />
          <Route path="/tabs/laws/:law" element={<Chapter />} />
          <Route path="/tabs/laws/murphy/new" element={<MurphyTool />} />
          <Route path="/tabs/laws/falkland/new" element={<FalklandTool />} />
          <Route path="/tabs/laws/kidlin/new" element={<KidlinTool />} />
          <Route path="/tabs/laws/wilson/new" element={<WilsonTool />} />
          <Route path="/tabs/laws/gilbert/new" element={<GilbertTool />} />
          <Route path="/tabs/journal" element={<Journal />} />
          <Route path="/tabs/journal/:table/:id" element={<EntryDetail />} />
          <Route path="/tabs/settings" element={<Settings />} />
          <Route path="/tabs/insights" element={<Insights />} />
          <Route path="/tabs" element={<Navigate to="/tabs/today" replace />} />
        </IonRouterOutlet>
        <IonTabBar slot="bottom" aria-label="Sections">
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
        <DeepLinks />
        <IonRouterOutlet>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/tabs/*" element={<Tabs />} />
          <Route path="*" element={<Navigate to="/tabs/today" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
