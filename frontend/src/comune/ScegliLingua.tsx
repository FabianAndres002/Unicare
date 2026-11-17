// Il pulsante per cambiare la lingua dell'app: mostra la lingua attuale, si apre un elenco
// con i nomi delle lingue scritti nella lingua stessa (Română, Українська…).

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Globe } from 'lucide-react'
import { LINGUE, type Lingua } from '../interprete/lingue'
import { CODICI, lingua, scegliLingua, t } from './lingua'

type Props = {
  /** Se c'è un account, la lingua si salva anche lì (prima di ricaricare). */
  salva?: (l: Lingua) => Promise<unknown>
  grande?: boolean
  className?: string
}

export default function ScegliLingua({ salva, grande, className = '' }: Props) {
  const [aperto, setAperto] = useState(false)
  const [occupato, setOccupato] = useState(false)
  const attuale = lingua()

  async function scegli(l: Lingua) {
    setOccupato(true)
    await salva?.(l).catch(() => {})
    scegliLingua(l)
    setAperto(false)
    setOccupato(false)
  }

  return (
    <div className={`scegli-lingua ${grande ? 'grande' : ''} ${className}`}>
      <button type="button" className="scegli-lingua-pulsante" aria-expanded={aperto} onClick={() => setAperto(!aperto)}>
        <Globe size={grande ? 26 : 18} /> {LINGUE[attuale].nome}
      </button>
      {aperto && createPortal(
        <div className="scegli-lingua-velo" onClick={() => setAperto(false)}>
        <ul className="scegli-lingua-elenco" role="listbox" aria-label={t('Lingua dell’app')} onClick={(e) => e.stopPropagation()}>
          <li className="scegli-lingua-titolo" aria-hidden="true"><Globe size={20} /> {t('Lingua dell’app')}</li>
          {CODICI.map((l) => (
            <li key={l}>
              <button type="button" role="option" aria-selected={l === attuale} disabled={occupato} lang={l} onClick={() => scegli(l)}>
                <span>{LINGUE[l].nome}</span>
                {l === attuale && <Check size={18} />}
              </button>
            </li>
          ))}
        </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}
