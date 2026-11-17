// "Non senti la voce?": mostra quali voci ha il dispositivo per le due lingue
// e fa una prova, così si capisce se manca la voce o se il browser la blocca.

import { useState } from 'react'
import { Volume2 } from 'lucide-react'
import { LINGUE, type Lingua } from './lingue'
import { infoVoce, provaVoce } from './voce'
import { t } from '../comune/lingua'

type Info = Awaited<ReturnType<typeof infoVoce>>

export default function ProvaVoce({ lingue }: { lingue: Lingua[] }) {
  const [info, setInfo] = useState<Partial<Record<Lingua, Info>>>({})
  const [stato, setStato] = useState<Partial<Record<Lingua, string>>>({})

  async function apri() {
    const nuove: Partial<Record<Lingua, Info>> = {}
    for (const l of lingue) nuove[l] = await infoVoce(LINGUE[l].voce)
    setInfo(nuove)
  }

  return (
    <details className="prova-voce" onToggle={(e) => (e.currentTarget.open ? void apri() : undefined)}>
      <summary>{t('Non senti la voce? Prova qui')}</summary>
      {lingue.map((l) => {
        const i = info[l]
        return (
          <div key={l} className="prova-voce-riga">
            <div>
              <strong>{LINGUE[l].nome}</strong>
              <small>
                {!i ? '…' : i.scelta ? i.scelta : t('Nessuna voce per questa lingua')}
                {i && ` · ${i.dellaLingua.length}/${i.totali}`}
                {stato[l] && ` · ${stato[l]}`}
              </small>
            </div>
            <button type="button" className="pulsante secondario con-icona" onClick={() => provaVoce(`${LINGUE[l].nome}. 1, 2, 3.`, LINGUE[l].voce, (s) => setStato((x) => ({ ...x, [l]: s })))}>
              <Volume2 size={18} />{' '}{t('Prova')}
            </button>
          </div>
        )
      })}
      <p className="nota senza-margine">{t('Se una lingua non ha voci, aggiungila dalle impostazioni del telefono o del computer (Windows: Impostazioni › Ora e lingua › Voce).')}</p>
    </details>
  )
}
