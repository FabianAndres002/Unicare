import type { Ruolo } from './api'

/** Età in anni compiuti da una data AAAA-MM-GG. */
export function eta(dataNascita: string | null): number | null {
  if (!dataNascita) return null
  const [a, m, g] = dataNascita.split('-').map(Number) as [number, number, number]
  const oggi = new Date()
  let anni = oggi.getFullYear() - a
  if (oggi.getMonth() + 1 < m || (oggi.getMonth() + 1 === m && oggi.getDate() < g)) anni--
  return anni
}

export const nomeRuolo: Record<Ruolo, string> = {
  ADMIN: 'Amministratore',
  FAMILIARE: 'Familiare',
  BADANTE: 'Badante',
}

export function saluto(): string {
  const ora = new Date().getHours()
  if (ora < 13) return 'Buongiorno'
  if (ora < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

export const dataEstesa = (d: Date | string) =>
  new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

export const dataBreve = (d: Date | string) =>
  new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })

/** "adesso", "5 minuti fa", "2 ore fa", "ieri alle 18:30", "3 novembre". */
export function tempoFa(d: string | Date): string {
  const data = new Date(d)
  const minuti = Math.round((Date.now() - data.getTime()) / 60000)
  if (minuti < 1) return 'adesso'
  if (minuti < 60) return `${minuti} ${minuti === 1 ? 'minuto' : 'minuti'} fa`
  const ore = Math.floor(minuti / 60)
  if (ore < 24 && data.getDate() === new Date().getDate()) return `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`
  const ora = data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const ieri = new Date(Date.now() - 86400000)
  if (data.toDateString() === ieri.toDateString()) return `ieri alle ${ora}`
  return `${dataBreve(data)} alle ${ora}`
}
