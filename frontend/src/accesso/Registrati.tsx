import type { Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import LayoutAccesso from './LayoutAccesso'
import ModuloRegistrati from './ModuloRegistrati'
import { t } from '../comune/lingua'

export default function Registrati({ onEntrato }: { onEntrato: (profilo: Profilo) => void }) {
  return (
    <LayoutAccesso titolo={t('Crea il tuo account')} sottotitolo={t('Ci vuole un minuto.')}>
      <ModuloRegistrati onEntrato={onEntrato} />
      <p className="cambio">{t('Hai già un account?')}{' '}<Collegamento a="/" className="link">{t('Accedi')}</Collegamento></p>
      <p className="cambio">{t('Registrandoti accetti')}{' '}<Collegamento a="/privacy" className="link">{t('come trattiamo i dati')}</Collegamento>.</p>
    </LayoutAccesso>
  )
}
