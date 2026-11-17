import type { Ruolo } from './api'
import { locale, t } from './lingua'

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
  ADMIN: t('Amministratore'),
  FAMILIARE: t('Familiare'),
  BADANTE: t('Badante'),
}

export function saluto(): string {
  const ora = new Date().getHours()
  if (ora < 13) return t('Buongiorno')
  if (ora < 18) return t('Buon pomeriggio')
  return t('Buonasera')
}

export const dataEstesa = (d: Date | string) =>
  new Date(d).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })

export const dataBreve = (d: Date | string) =>
  new Date(d).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })

/** "adesso", "5 minuti fa", "2 ore fa", "ieri alle 18:30", "3 novembre". */
export function tempoFa(d: string | Date): string {
  const data = new Date(d)
  const minuti = Math.round((Date.now() - data.getTime()) / 60000)
  if (minuti < 1) return t('adesso')
  if (minuti < 60) return minuti === 1 ? t('1 minuto fa') : t('{0} minuti fa', minuti)
  const ore = Math.floor(minuti / 60)
  if (ore < 24 && data.getDate() === new Date().getDate()) return ore === 1 ? t('1 ora fa') : t('{0} ore fa', ore)
  const ora = data.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
  const ieri = new Date(Date.now() - 86400000)
  if (data.toDateString() === ieri.toDateString()) return t('ieri alle {0}', ora)
  return t('{0} alle {1}', dataBreve(data), ora)
}
