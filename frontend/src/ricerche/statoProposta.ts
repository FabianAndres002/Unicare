// Come si chiama, per la badante, lo stato di una sua proposta.

import type { StatoProposta } from '../comune/api'

export const STATO_PROPOSTA: Record<StatoProposta, { testo: string; classe: string }> = {
  INVIATA: { testo: 'In attesa di risposta', classe: 'stato-aperta' },
  SCELTA: { testo: 'La famiglia ti ha scritto', classe: 'stato-fatta' },
  NON_SCELTA: { testo: 'Non scelta', classe: 'stato-annullata' },
  RITIRATA: { testo: 'Ritirata', classe: 'stato-annullata' },
}
