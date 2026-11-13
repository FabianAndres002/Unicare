// Come si presentano le categorie dei documenti sanitari.

import { FileHeart, FlaskConical, Pill, Receipt, ScanLine, FileText, type LucideIcon } from 'lucide-react'
import type { CategoriaDocumento } from '../comune/api'

export const CATEGORIE_DOCUMENTO: Record<CategoriaDocumento, { nome: string; esempi: string; Icona: LucideIcon; colore: string }> = {
  PRESCRIZIONE: { nome: 'Ricette e prescrizioni', esempi: 'Ricette del medico, piani terapeutici', Icona: Pill, colore: 'verde' },
  ANALISI: { nome: 'Analisi', esempi: 'Analisi del sangue, delle urine', Icona: FlaskConical, colore: 'viola' },
  IMMAGINI: { nome: 'Ecografie e lastre', esempi: 'Ecografie, radiografie, TAC, risonanze', Icona: ScanLine, colore: 'blu' },
  REFERTO: { nome: 'Referti e visite', esempi: 'Visite specialistiche, dimissioni', Icona: FileHeart, colore: 'arancio' },
  RICEVUTA: { nome: 'Ricevute e spese', esempi: 'Ticket, farmacia: utili per il 730', Icona: Receipt, colore: 'grigio' },
  ALTRO: { nome: 'Altro', esempi: 'Tessera sanitaria, invalidità...', Icona: FileText, colore: 'grigio' },
}

export const ORDINE_CATEGORIE: CategoriaDocumento[] = ['PRESCRIZIONE', 'ANALISI', 'IMMAGINI', 'REFERTO', 'RICEVUTA', 'ALTRO']

export const euro = (centesimi: number) => (centesimi / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

/** "12 marzo 2026" da AAAA-MM-GG. */
export const dataDocumento = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

export const dimensione = (byte: number) => (byte < 1024 * 1024 ? `${Math.max(1, Math.round(byte / 1024))} KB` : `${(byte / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)

/**
 * Le foto del telefono pesano anche 5 MB: le rimpiccioliamo (lato lungo 2000 pixel, JPEG)
 * prima di caricarle. Si legge ancora tutto benissimo. I PDF restano come sono.
 */
export async function preparaFile(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.size < 600 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
    const tela = document.createElement('canvas')
    tela.width = Math.round(bitmap.width * scala)
    tela.height = Math.round(bitmap.height * scala)
    tela.getContext('2d')!.drawImage(bitmap, 0, 0, tela.width, tela.height)
    const jpeg = await new Promise<Blob | null>((ok) => tela.toBlob(ok, 'image/jpeg', 0.85))
    return jpeg && jpeg.size < file.size ? jpeg : file
  } catch {
    return file // per esempio una foto HEIC che il browser non sa aprire: la carichiamo così
  }
}
