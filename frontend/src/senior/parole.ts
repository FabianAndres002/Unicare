// Le parole della Senior App: frasi semplici, in prima persona.

import type { Categoria, Richiesta } from '../comune/api'

export const COSA_CHIEDO: Record<Exclude<Categoria, 'ALTRO'>, { titolo: string; domanda: string }> = {
  SPESA: { titolo: 'La spesa', domanda: 'Chiedo qualcuno per la spesa?' },
  FARMACIA: { titolo: 'La farmacia', domanda: 'Chiedo qualcuno per la farmacia?' },
  ACCOMPAGNAMENTO: { titolo: 'Un passaggio', domanda: 'Chiedo qualcuno che mi accompagni?' },
  COMPAGNIA: { titolo: 'Compagnia', domanda: 'Chiedo una visita per fare due chiacchiere?' },
  CASA: { titolo: 'Una mano in casa', domanda: 'Chiedo una mano in casa?' },
}

export const titoloRichiesta = (r: Richiesta) =>
  r.categoria === 'ALTRO' ? (r.testo ?? 'Un aiuto') : COSA_CHIEDO[r.categoria].titolo

export function statoPerAnziano(r: Richiesta): string {
  switch (r.stato) {
    case 'APERTA':
      return 'Ho avvisato la tua famiglia. Aspettiamo chi se ne occupa.'
    case 'PRESA_IN_CARICO':
      return `Se ne occupa ${r.presaDa?.nome ?? 'la tua famiglia'}.`
    case 'COMPLETATA':
      return `Fatto${r.presaDa ? ` da ${r.presaDa.nome}` : ''}.`
    case 'ANNULLATA':
      return 'Annullata: non serviva più.'
  }
}
