import { IonButton, IonIcon, IonInput, IonItem, IonSelect, IonSelectOption, IonSpinner, IonTextarea } from '@ionic/react';
import { LIFE_AREAS, type LifeArea } from '@shared/laws';
import type { FailReason } from '@shared/steps';
import { closeOutline } from 'ionicons/icons';
import { useId } from 'react';
import { aiFailNotice } from '../content/ai';
import { LIFE_AREA_LABEL } from '../content/labels';

type TextProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: 'text' | 'date';
  helper?: string;
  placeholder?: string;
  maxlength?: number;
};

/** One field the user writes in. Rendered in their handwriting colour. */
export function TextField({ label, value, onChange, multiline, type = 'text', helper, placeholder, maxlength = 300 }: TextProps) {
  const common = { label, labelPlacement: 'stacked' as const, fill: 'outline' as const, value, placeholder, helperText: helper, className: 'paper-input field' };
  return multiline ? (
    <IonTextarea {...common} autoGrow rows={3} maxlength={maxlength} onIonInput={(e) => onChange(e.detail.value ?? '')} />
  ) : (
    <IonInput {...common} type={type} maxlength={type === 'date' ? undefined : maxlength} onIonInput={(e) => onChange(e.detail.value ?? '')} />
  );
}

type ListProps = { label: string; itemLabel: string; values: string[]; onChange: (v: string[]) => void; min?: number; max: number; placeholder?: string };

/** A short list of lines, e.g. options or if-then plans. Always shows at least `min` rows. */
export function ListField({ label, itemLabel, values, onChange, min = 1, max, placeholder }: ListProps) {
  const id = useId();
  const rows = values.length >= min ? values : [...values, ...Array<string>(min - values.length).fill('')];
  const set = (i: number, v: string) => onChange(rows.map((x, j) => (j === i ? v : x)));
  return (
    <fieldset className="list-field" aria-labelledby={id}>
      <legend id={id}>{label}</legend>
      {rows.map((v, i) => (
        <div key={i} className="list-row">
          <IonInput
            label={`${itemLabel} ${i + 1}`}
            labelPlacement="stacked"
            fill="outline"
            className="paper-input field"
            value={v}
            placeholder={placeholder}
            maxlength={200}
            onIonInput={(e) => set(i, e.detail.value ?? '')}
          />
          {rows.length > min && (
            <IonButton fill="clear" aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              <IonIcon slot="icon-only" icon={closeOutline} aria-hidden="true" />
            </IonButton>
          )}
        </div>
      ))}
      {rows.length < max && (
        <IonButton fill="clear" size="small" onClick={() => onChange([...rows, ''])}>
          Add {itemLabel.toLowerCase()}
        </IonButton>
      )}
    </fieldset>
  );
}

export function AreaSelect({ value, onChange }: { value: LifeArea; onChange: (a: LifeArea) => void }) {
  return (
    <IonItem lines="none">
      <IonSelect label="Part of life" value={value} interface="popover" onIonChange={(e) => onChange(e.detail.value as LifeArea)}>
        {LIFE_AREAS.map((a) => (
          <IonSelectOption key={a} value={a}>
            {LIFE_AREA_LABEL[a]}
          </IonSelectOption>
        ))}
      </IonSelect>
    </IonItem>
  );
}

/** Shown while an AI step runs. The user can always stop waiting and write it themselves. */
export function AiWait({ label, onSkip }: { label: string; onSkip: () => void }) {
  return (
    <div className="ai-wait" role="status" aria-live="polite">
      <IonSpinner name="dots" aria-hidden="true" />
      <p>{label}</p>
      <IonButton fill="outline" onClick={onSkip}>
        Write it myself
      </IonButton>
    </div>
  );
}

export function AiNotice({ reason }: { reason: FailReason | null }) {
  const text = aiFailNotice(reason);
  return text ? (
    <p className="notice" role="status">
      {text}
    </p>
  ) : null;
}

export function SaveError({ show }: { show: boolean }) {
  return show ? (
    <p className="notice notice-danger" role="alert">
      That didn't save. Your writing is still here; try again.
    </p>
  ) : null;
}
