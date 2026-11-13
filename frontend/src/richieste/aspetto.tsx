// Come si presentano categorie e stati: icona, colore, parole.

import { Car, Coffee, MessageCircle, Pill, ShoppingBasket, Wrench, type LucideIcon } from 'lucide-react'
import type { Categoria, StatoRichiesta } from '../comune/api'

export const CATEGORIE: Record<Categoria, { etichetta: string; esempio: string; Icona: LucideIcon; colore: string }> = {
  SPESA: { etichetta: 'Spesa', esempio: 'Latte, pane, frutta…', Icona: ShoppingBasket, colore: 'verde' },
  FARMACIA: { etichetta: 'Farmacia', esempio: 'Ritirare le medicine', Icona: Pill, colore: 'arancio' },
  ACCOMPAGNAMENTO: { etichetta: 'Accompagnamento', esempio: 'Medico, posta, banca', Icona: Car, colore: 'blu' },
  COMPAGNIA: { etichetta: 'Compagnia', esempio: 'Una visita, due chiacchiere', Icona: Coffee, colore: 'viola' },
  CASA: { etichetta: 'Casa', esempio: 'Una lampadina, la caldaia', Icona: Wrench, colore: 'grigio' },
  ALTRO: { etichetta: 'Altro', esempio: 'Scrivi tu di cosa c’è bisogno', Icona: MessageCircle, colore: 'grigio' },
}

export const STATI: Record<StatoRichiesta, { etichetta: string; classe: string }> = {
  APERTA: { etichetta: 'Da fare', classe: 'stato-aperta' },
  PRESA_IN_CARICO: { etichetta: 'In corso', classe: 'stato-corso' },
  COMPLETATA: { etichetta: 'Fatta', classe: 'stato-fatta' },
  ANNULLATA: { etichetta: 'Annullata', classe: 'stato-annullata' },
}
