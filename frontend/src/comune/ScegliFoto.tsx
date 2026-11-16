// La foto profilo grande con il pulsante della macchina fotografica sopra:
// si sceglie dalla galleria o si scatta, l'app la ritaglia quadrata e la rimpicciolisce
// (512 px, JPEG) prima di mandarla, così pesa poco anche con la connessione del telefono.

import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import Avatar from './Avatar'
import { messaggioErrore } from './api'

type Props = {
  nome: string
  cognome?: string
  foto: string | null
  onCarica: (foto: Blob) => Promise<void>
  onTogli: () => Promise<void>
  /** Per gli screen reader: "la tua foto", "la foto di Pina". */
  etichetta: string
}

const LATO = 512

/** Ritaglia al centro un quadrato e lo rimpicciolisce a 512×512 JPEG. */
async function preparaFoto(file: File): Promise<Blob> {
  const immagine = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null)
  if (!immagine) throw new Error('Non riesco ad aprire questa foto. Prova con un\'altra.')
  const lato = Math.min(immagine.width, immagine.height)
  const tela = document.createElement('canvas')
  tela.width = tela.height = Math.min(LATO, lato)
  const ctx = tela.getContext('2d')!
  ctx.drawImage(immagine, (immagine.width - lato) / 2, (immagine.height - lato) / 2, lato, lato, 0, 0, tela.width, tela.height)
  immagine.close()
  const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Non riesco a preparare la foto. Prova con un\'altra.')
  return blob
}

export default function ScegliFoto({ nome, cognome, foto, onCarica, onTogli, etichetta }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

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
        aria-label={foto ? `Cambia ${etichetta}` : `Aggiungi ${etichetta}`}>
        <Avatar nome={nome} cognome={cognome} foto={foto} className="avatar-foto" />
        <span className={`scegli-foto-camera ${occupato ? 'gira' : ''}`} aria-hidden="true"><Camera size={18} /></span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void esegui(async () => onCarica(await preparaFoto(file)))
        }} />
      {foto
        ? <button type="button" className="collegamento-piccolo" disabled={occupato} onClick={() => void esegui(onTogli)}><Trash2 size={14} /> Togli la foto</button>
        : <span className="nota-piccola">Tocca per mettere una foto</span>}
      {errore && <p className="errore" role="alert">{errore}</p>}
    </div>
  )
}
