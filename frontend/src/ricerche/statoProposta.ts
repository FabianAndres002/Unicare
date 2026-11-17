// Come si chiama, per la badante, lo stato di una sua proposta.

import type { StatoProposta } from '../comune/api'
import { t } from '../comune/lingua'

export const STATO_PROPOSTA: Record<StatoProposta, { testo: string; classe: string }> = {
  INVIATA: { testo: t('In attesa di risposta'), classe: 'stato-aperta' },
  SCELTA: { testo: t('La famiglia ti ha scritto'), classe: 'stato-fatta' },
  NON_SCELTA: { testo: t('Non scelta'), classe: 'stato-annullata' },
  RITIRATA: { testo: t('Ritirata'), classe: 'stato-annullata' },
}
