import { t } from '../comune/lingua'

/** Il campo per il codice di 6 numeri ricevuto per email. */
export default function CampoCodice({ valore, onCambia }: { valore: string; onCambia: (v: string) => void }) {
  return (
    <label>
      {t('Codice di 6 numeri')}
      <input className="campo-codice" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
        placeholder="000000" required value={valore} onChange={(e) => onCambia(e.target.value.replace(/\D/g, '').slice(0, 6))} />
    </label>
  )
}
