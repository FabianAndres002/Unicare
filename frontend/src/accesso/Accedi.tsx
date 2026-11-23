import type { Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import LayoutAccesso from './LayoutAccesso'
import ModuloAccedi from './ModuloAccedi'
import { t } from '../comune/lingua'

export default function Accedi({ onEntrato }: { onEntrato: (profilo: Profilo) => void }) {
  return (
    <LayoutAccesso titolo={t('Bentornato')} sottotitolo={t('Accedi per vedere il tuo cerchio.')}>
      <ModuloAccedi onEntrato={onEntrato} />
      <p className="cambio"><Collegamento a="/password-dimenticata" className="link">{t('Password dimenticata?')}</Collegamento></p>
      <p className="cambio">{t('Non hai un account?')}{' '}<Collegamento a="/registrati" className="link">{t('Registrati')}</Collegamento></p>
      <p className="cambio">{t('È il telefono di un anziano?')}{' '}<Collegamento a="/senior" className="link">{t('Collegalo con il codice')}</Collegamento></p>
      <p className="cambio"><Collegamento a="/privacy" className="link">{t('Come trattiamo i tuoi dati')}</Collegamento></p>
    </LayoutAccesso>
  )
}
