// La foto profilo grande con il pulsante della macchina fotografica sopra:
// si sceglie dalla galleria o si scatta, l'app la ritaglia quadrata e la rimpicciolisce
// (512 px, JPEG) prima di mandarla, così pesa poco anche con la connessione del telefono.
// Chi non vuole la foto sceglie uno dei nostri disegni (file in public/avatar).

import { useRef, useState } from 'react'
import { Camera, Check, Smile, Trash2 } from 'lucide-react'
import Avatar from './Avatar'
import { messaggioErrore } from './api'
import { t } from './lingua'

type Props = {
  nome: string
  cognome?: string
  foto: string | null
  onCarica: (foto: Blob) => Promise<void>
  onTogli: () => Promise<void>
  onDisegno: (disegno: string) => Promise<void>
  /** Per gli screen reader: "la tua foto", "la foto di Pina". */
  etichetta: string
}

const LATO = 512

/** I disegni che si possono scegliere (stessi nomi del backend, foto.ts). */
const DISEGNI = [
  ['nonna', t('Nonna')], ['nonno', t('Nonno')], ['nonno-baffi', t('Nonno coi baffi')], ['donna', t('Donna')],
  ['donna-ricci', t('Donna riccia')], ['donna-treccine', t('Donna con treccine')], ['donna-bionda', t('Donna bionda')], ['ragazza', t('Ragazza')],
  ['ragazza-viola', t('Ragazza viola')], ['uomo', t('Uomo')], ['uomo-elegante', t('Uomo elegante')], ['uomo-cuffia', t('Uomo con cuffia')],
  ['uomo-viola', t('Uomo viola')], ['ragazzo', t('Ragazzo')], ['ragazzo-righe', t('Ragazzo a righe')], ['gatto', t('Gatto')],
  ['cane', t('Cane')], ['cane-felice', t('Cane felice')], ['carlino', t('Carlino')], ['leone', t('Leone')],
  ['nonna-perle', t('Nonna con le perle')], ['nonno-coppola', t('Nonno con la coppola')], ['nonno-barba', t('Nonno con la barba')], ['signora', t('Signora')],
  ['donna-sciarpa', t('Donna con sciarpa')], ['ragazza-rossa', t('Ragazza rossa')], ['ragazza-rosa', t('Ragazza coi capelli rosa')], ['ragazza-rasata', t('Ragazza rasata')],
  ['bimba-barca', t('Bimba con la barchetta')], ['uomo-turbante', t('Uomo col turbante')], ['uomo-camicia', t('Uomo in camicia')], ['uomo-baffetti', t('Uomo coi baffetti')],
  ['uomo-biondo', t('Uomo biondo')], ['ragazzo-occhiali', t('Ragazzo con gli occhiali')], ['pastore-tedesco', t('Pastore tedesco')], ['volpe', t('Volpe')],
  ['gufo', t('Gufo')], ['orsetto', t('Orsetto')],
] as const

/** Ritaglia al centro un quadrato e lo rimpicciolisce a 512×512 JPEG. */
async function preparaFoto(file: File): Promise<Blob> {
  const immagine = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null)
  if (!immagine) throw new Error(t('Non riesco ad aprire questa foto. Prova con un\'altra.'))
  const lato = Math.min(immagine.width, immagine.height)
  const tela = document.createElement('canvas')
  tela.width = tela.height = Math.min(LATO, lato)
  const ctx = tela.getContext('2d')!
  ctx.drawImage(immagine, (immagine.width - lato) / 2, (immagine.height - lato) / 2, lato, lato, 0, 0, tela.width, tela.height)
  immagine.close()
  const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, 'image/jpeg', 0.85))
  if (!blob) throw new Error(t('Non riesco a preparare la foto. Prova con un\'altra.'))
  return blob
}

export default function ScegliFoto({ nome, cognome, foto, onCarica, onTogli, onDisegno, etichetta }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [disegni, setDisegni] = useState(false)

  async function esegui(azione: () => Promise<void>) {
    setOccupato(true)
    setErrore(null)
    try {
      await azione()
    } catch (e) {
      setErrore(e instanceof Error && !('codice' in e) ? e.message : messaggioErrore(e))
    } finally {
      setOccupato(false)
    }
  }

  return (
    <div className="scegli-foto">
      <button type="button" className="scegli-foto-pulsante" disabled={occupato} onClick={() => input.current?.click()}
        aria-label={foto ? t('Cambia {0}', etichetta) : t('Aggiungi {0}', etichetta)}>
        <Avatar nome={nome} cognome={cognome} foto={foto} className="avatar-foto" />
        <span className={`scegli-foto-camera ${occupato ? 'gira' : ''}`} aria-hidden="true"><Camera size={18} /></span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void esegui(async () => onCarica(await preparaFoto(file)))
        }} />
      <div className="scegli-foto-azioni">
        <button type="button" className="collegamento-piccolo viola" disabled={occupato} aria-expanded={disegni} onClick={() => setDisegni(!disegni)}>
          <Smile size={15} /> {disegni ? t('Chiudi i disegni') : t('Scegli un disegno')}
        </button>
        {foto && <button type="button" className="collegamento-piccolo" disabled={occupato} onClick={() => void esegui(onTogli)}><Trash2 size={14} />{' '}{t('Togli')}</button>}
      </div>
      {!foto && !disegni && <span className="nota-piccola">{t('Tocca il cerchio per mettere una foto')}</span>}
      {disegni && (
        <div className="griglia-disegni" role="group" aria-label={t('Disegni')}>
          {DISEGNI.map(([chiave, titolo]) => {
            const url = `/avatar/${chiave}.webp`
            return (
              <button key={chiave} type="button" className={`disegno ${foto === url ? 'scelto' : ''}`} aria-pressed={foto === url} disabled={occupato}
                onClick={() => void esegui(async () => { await onDisegno(chiave); setDisegni(false) })}>
                <img src={url} alt="" />
                <span>{titolo}</span>
                {foto === url && <Check size={16} className="disegno-spunta" />}
              </button>
            )
          })}
        </div>
      )}
      {errore && <p className="errore" role="alert">{errore}</p>}
    </div>
  )
}
