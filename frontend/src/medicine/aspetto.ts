// Come si presentano i momenti della giornata e lo stato delle medicine.

import { Moon, Sun, Sunrise, type LucideIcon } from 'lucide-react'
import type { Momento, Occorrenza } from '../comune/api'

export const MOMENTI: Record<Momento, { etichetta: string; titolo: string; oraPredefinita: string; Icona: LucideIcon; colore: string }> = {
  MATTINO: { etichetta: 'Mattino', titolo: 'Medicine del mattino', oraPredefinita: '08:00', Icona: Sunrise, colore: 'arancio' },
  PRANZO: { etichetta: 'Pranzo', titolo: 'Medicine del pranzo', oraPredefinita: '13:00', Icona: Sun, colore: 'verde' },
  SERA: { etichetta: 'Sera', titolo: 'Medicine della sera', oraPredefinita: '20:00', Icona: Moon, colore: 'viola' },
}

export const ORDINE_MOMENTI: Momento[] = ['MATTINO', 'PRANZO', 'SERA']

// Gli orari dei promemoria sono sempre quelli italiani, come li ha impostati la famiglia.
export const oraBreve = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })

/** "Presa alle 8:12", "Non confermata", "Alle 20:00"... */
export function statoMedicina(o: Occorrenza): { testo: string; classe: string } {
  if (o.stato === 'FATTO') return { testo: `Presa alle ${oraBreve(o.confermatoIl!)}`, classe: 'stato-fatta' }
  if (o.stato === 'NON_CONFERMATO') return { testo: 'Non confermata', classe: 'stato-allarme' }
  if (new Date(o.previstoIl).getTime() > Date.now()) return { testo: `Alle ${oraBreve(o.previstoIl)}`, classe: 'stato-annullata' }
  return { testo: o.rimandi ? 'Rimandata di 15 minuti' : 'In attesa del “Fatto”', classe: 'stato-aperta' }
}
