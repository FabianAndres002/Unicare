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
