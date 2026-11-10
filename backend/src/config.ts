// Impostazioni del backend, lette dalle variabili d'ambiente con valori comodi per lo sviluppo.

const inProduzione = process.env.NODE_ENV === 'production'

export const config = {
  porta: Number(process.env.PORT ?? 8080),
  inProduzione,

  // Se DATABASE_URL è vuoto usiamo il PostgreSQL integrato (PGlite):
  // gira dentro Node, non va installato nulla. I dati restano in questa cartella.
  databaseUrl: process.env.DATABASE_URL ?? '',
  cartellaDatabaseLocale: process.env.CARTELLA_DATABASE ?? '.database-locale',

  // Chiave per firmare i cookie di accesso. In produzione DEVE essere impostata.
  segretoJwt: process.env.JWT_SECRET ?? 'solo-per-sviluppo-cambiami',
  durataAccessoGiorni: 30,
}

if (inProduzione && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET mancante: impostalo prima di avviare in produzione.')
}
