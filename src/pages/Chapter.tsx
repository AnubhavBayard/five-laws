import { IonButton } from '@ionic/react';
import { useParams } from 'react-router-dom';
import Page from '../components/Page';
import { chapterFor } from '../content/chapters';

/** Laws whose tool is built. The rest arrive in later milestones. */
const HAS_TOOL = new Set(['murphy', 'falkland']);

export default function Chapter() {
  const { law = '' } = useParams();
  const c = chapterFor(law);
  if (!c) return <Page title="Not found" backHref="/tabs/laws"><p>That chapter doesn't exist.</p></Page>;

  return (
    <Page title={c.name} backHref="/tabs/laws">
      <article>
        <p className="numeral">
          Chapter {c.numeral} · {c.theme}
        </p>
        <h1>{c.name}</h1>
        <p className="display" style={{ fontSize: '1.25rem' }}>
          {c.statement}
        </p>
        {c.paragraphs.map((p) => (
          <p key={p}>
            {p.includes(c.keyLine) ? (
              <>
                {p.split(c.keyLine)[0]}
                <mark className="highlight">{c.keyLine}</mark>
                {p.split(c.keyLine)[1]}
              </>
            ) : (
              p
            )}
          </p>
        ))}
        {HAS_TOOL.has(c.law) && (
          <IonButton expand="block" className="ion-margin-top" routerLink={`/tabs/laws/${c.law}/new`}>
            Try it: {c.toolName}
          </IonButton>
        )}
        <p className="footnote">
          <sup aria-hidden="true">*</sup> {c.footnote}
        </p>
      </article>
    </Page>
  );
}
