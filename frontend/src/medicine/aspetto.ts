// Come si presentano i momenti della giornata e lo stato delle medicine.

import { Moon, Sun, Sunrise, type LucideIcon } from 'lucide-react'
import type { Momento, Occorrenza } from '../comune/api'
import { locale, t } from '../comune/lingua'

export const MOMENTI: Record<Momento, { etichetta: string; titolo: string; oraPredefinita: string; Icona: LucideIcon; colore: string }> = {
  MATTINO: { etichetta: t('Mattino'), titolo: t('Medicine del mattino'), oraPredefinita: '08:00', Icona: Sunrise, colore: 'arancio' },
  PRANZO: { etichetta: t('Pranzo'), titolo: t('Medicine del pranzo'), oraPredefinita: '13:00', Icona: Sun, colore: 'verde' },
  SERA: { etichetta: t('Sera'), titolo: t('Medicine della sera'), oraPredefinita: '20:00', Icona: Moon, colore: 'viola' },
}

export const ORDINE_MOMENTI: Momento[] = ['MATTINO', 'PRANZO', 'SERA']

// Gli orari dei promemoria sono sempre quelli italiani, come li ha impostati la famiglia.
export const oraBreve = (iso: string) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })

/** "Presa alle 8:12", "Non confermata", "Alle 20:00"... */
export function statoMedicina(o: Occorrenza): { testo: string; classe: string } {
  if (o.stato === 'FATTO') return { testo: t('Presa alle {0}', oraBreve(o.confermatoIl!)), classe: 'stato-fatta' }
  if (o.stato === 'NON_CONFERMATO') return { testo: t('Non confermata'), classe: 'stato-allarme' }
  if (new Date(o.previstoIl).getTime() > Date.now()) return { testo: t('Alle {0}', oraBreve(o.previstoIl)), classe: 'stato-annullata' }
  return { testo: o.rimandi ? t('Rimandata di 15 minuti') : t('In attesa del “Fatto”'), classe: 'stato-aperta' }
}
