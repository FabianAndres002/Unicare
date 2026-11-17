// Le parole della Senior App: frasi semplici, in prima persona.

import type { Categoria, Richiesta } from '../comune/api'
import { t } from '../comune/lingua'

export const COSA_CHIEDO: Record<Exclude<Categoria, 'ALTRO'>, { titolo: string; domanda: string }> = {
  SPESA: { titolo: t('La spesa'), domanda: t('Chiedo qualcuno per la spesa?') },
  FARMACIA: { titolo: t('La farmacia'), domanda: t('Chiedo qualcuno per la farmacia?') },
  ACCOMPAGNAMENTO: { titolo: t('Un passaggio'), domanda: t('Chiedo qualcuno che mi accompagni?') },
  COMPAGNIA: { titolo: t('Compagnia'), domanda: t('Chiedo una visita per fare due chiacchiere?') },
  CASA: { titolo: t('Una mano in casa'), domanda: t('Chiedo una mano in casa?') },
}

export const titoloRichiesta = (r: Richiesta) =>
  r.categoria === 'ALTRO' ? (r.testo ?? t('Un aiuto')) : COSA_CHIEDO[r.categoria].titolo

export function statoPerAnziano(r: Richiesta): string {
  switch (r.stato) {
    case 'APERTA':
      return t('Ho avvisato la tua famiglia. Aspettiamo chi se ne occupa.')
    case 'PRESA_IN_CARICO':
      return t('Se ne occupa {0}.', r.presaDa?.nome ?? 'la tua famiglia')
    case 'COMPLETATA':
      return t('Fatto{0}.', r.presaDa ? ` da ${r.presaDa.nome}` : '')
    case 'ANNULLATA':
      return t('Annullata: non serviva più.')
  }
}

/** Il colore del riquadro di ogni scelta in "Di cosa hai bisogno?". */
export const TINTA: Record<Exclude<Categoria, 'ALTRO'>, string> = {
  SPESA: 'tinta-spesa',
  FARMACIA: 'tinta-farmacia',
  ACCOMPAGNAMENTO: 'tinta-passaggio',
  COMPAGNIA: 'tinta-compagnia',
  CASA: 'tinta-casa',
}
