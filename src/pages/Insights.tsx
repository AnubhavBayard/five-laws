import { IonButton, useIonViewWillEnter } from '@ionic/react';
import { unknownNumbers } from '@shared/checks';
import { useState } from 'react';
import { aiAvailable, runStep } from '../ai/runStep';
import { AiWait } from '../components/form';
import Page from '../components/Page';
import { briefs, decisions, fears, learning, problems, questionLog } from '../db/repos';
import { today } from '../lib/dates';
import { type AllStats, decisionStats, insightInput, MIN_ENTRIES_FOR_INSIGHT, totalEntries } from '../stats/insights';
import { problemStats } from '../stats/kidlin';
import { fearStats } from '../stats/murphy';
import { learningStats } from '../stats/wilson';

async function loadStats(): Promise<AllStats> {
  return {
    fears: fearStats(await fears.list()),
    problems: problemStats(await problems.list()),
    learning: learningStats(await learning.list(), await questionLog.list(), today()),
    decisions: decisionStats(await decisions.list()),
    briefs: (await briefs.list()).length,
  };
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="stat">
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}

type Obs = { state: 'idle' } | { state: 'busy' } | { state: 'done'; text: string } | { state: 'none' };

export default function Insights() {
  const [s, setS] = useState<AllStats | null>(null);
  const [obs, setObs] = useState<Obs>({ state: 'idle' });

  useIonViewWillEnter(() => {
    setObs({ state: 'idle' });
    loadStats()
      .then(setS)
      .catch(() => setS(null));
  });

  async function observe() {
    if (!s) return;
    const stats = insightInput(s);
    setObs({ state: 'busy' });
    const r = await runStep('write_insight', { stats });
    // The server already checked the numbers; check again, because nothing from the network is trusted.
    setObs(r.ok && unknownNumbers(r.output.observation, stats).length === 0 ? { state: 'done', text: r.output.observation } : { state: 'none' });
  }

  if (!s || totalEntries(s) === 0) {
    return (
      <Page srTitle title="Insights">
        <p className="empty">Insights appear once you've written a few entries. Every number here is counted from your own journal.</p>
      </Page>
    );
  }

  const { fears: f, problems: p, learning: l, decisions: d } = s;
  return (
    <Page srTitle title="Insights">
      <p className="muted">Every number here is counted from your own journal, on this phone.</p>

      {obs.state === 'busy' && <AiWait label="Reading your numbers…" onSkip={() => setObs({ state: 'none' })} />}
      {obs.state === 'done' && <p className="notice">{obs.text}</p>}
      {obs.state === 'none' && <p className="muted">No observation this time. The numbers below are the whole story.</p>}
      {obs.state === 'idle' && aiAvailable() && totalEntries(s) >= MIN_ENTRIES_FOR_INSIGHT && (
        <IonButton expand="block" fill="outline" onClick={() => void observe()}>
          Write me one observation
        </IonButton>
      )}

      <h2>Fears</h2>
      <div className="stat-grid">
        <Stat n={f.logged} label="forecast" />
        <Stat n={f.resolved} label="checked against reality" />
        {f.didntPct !== null && <Stat n={`${f.didntPct}%`} label="didn't happen" />}
      </div>
      {f.predictedPct !== null && f.actualPct !== null && (
        <p>
          On average you gave your fears <mark className="highlight">{f.predictedPct}%</mark>. They came true about <mark className="highlight">{f.actualPct}%</mark> of the time.
        </p>
      )}

      <h2>Problems</h2>
      <div className="stat-grid">
        <Stat n={p.open} label="open" />
        <Stat n={p.resolved} label="solved" />
      </div>
      {p.topTags.length > 0 && <p>Comes up most: {p.topTags.map((t) => `${t.tag} (${t.count})`).join(', ')}.</p>}

      <h2>Learning</h2>
      <div className="stat-grid">
        <Stat n={l.topics} label="topics" />
        <Stat n={l.questions} label="questions asked" />
        <Stat n={l.streak} label={l.streak === 1 ? 'day asking questions' : 'days in a row asking questions'} />
        <Stat n={l.changedMind} label="times you changed your mind" />
      </div>

      <h2>Decisions</h2>
      <div className="stat-grid">
        <Stat n={d.parked} label="parked" />
        <Stat n={d.decided + d.reviewed} label="decided" />
        <Stat n={d.reviewed} label="reviewed afterwards" />
      </div>
      {d.parkedAgain > 0 && <p>You've pushed parked decisions back {d.parkedAgain} {d.parkedAgain === 1 ? 'time' : 'times'}.</p>}

      <h2>Briefs and plans</h2>
      <div className="stat-grid">
        <Stat n={s.briefs} label="written" />
      </div>
      <div className="actions">
        <IonButton expand="block" fill="clear" routerLink="/tabs/journal">
          Read the entries behind these numbers
        </IonButton>
      </div>
    </Page>
  );
}
