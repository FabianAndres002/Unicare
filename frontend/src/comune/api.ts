// Tutte le chiamate al backend passano da qui.

export type Stato = {
  app: string
  database: string
  tabelle: number
}

export async function leggiStato(): Promise<Stato> {
  const risposta = await fetch('/api/stato')
  if (!risposta.ok) {
    throw new Error(`Il backend ha risposto ${risposta.status}`)
  }
  return risposta.json()
}
