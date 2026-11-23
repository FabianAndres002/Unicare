// Impostazioni del backend, lette dalle variabili d'ambiente con valori comodi per lo sviluppo.

// Le chiavi segrete (per esempio DEEPL_API_KEY) si possono scrivere nel file backend/.env,
// che NON va su GitHub. Nei test non lo leggiamo: lì si usano servizi finti.
if (!process.env.VITEST) {
  try {
    process.loadEnvFile('.env')
  } catch {
    // nessun file .env: va bene così
  }
}

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

  // Codice per registrarsi (prova in famiglia via tunnel). Vuoto = registrazione libera.
  // Chi arriva da un link d'invito non ne ha bisogno.
  codiceRegistrazione: (process.env.CODICE_REGISTRAZIONE ?? '').trim(),

  // Indirizzo dell'app, usato nei link dentro le email.
  // Su Render, se URL_APP non c'è, si usa l'indirizzo che Render dà al servizio.
  urlApp: process.env.URL_APP ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173',

  // In produzione il backend serve anche le pagine dell'app (cartella creata da "npm run build").
  cartellaFrontend: process.env.CARTELLA_FRONTEND ?? '../frontend/dist',

  // Email. Se SMTP_HOST è vuoto non si spedisce nulla: ogni email viene salvata come
  // pagina .html in questa cartella, così si può vedere com'è senza un vero servizio di posta.
  cartellaPostaLocale: process.env.CARTELLA_POSTA ?? '.posta-locale',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    porta: Number(process.env.SMTP_PORT || 587),
    utente: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    mittente: process.env.SMTP_FROM || 'Unicare <avvisi@unicare.local>',
  },

  // Conferma dell'email con un codice dopo la registrazione. Di solito si accende da sola
  // quando le email partono davvero (SMTP_HOST); CONFERMA_EMAIL=1 o 0 la forza.
  confermaEmail: process.env.CONFERMA_EMAIL ? process.env.CONFERMA_EMAIL === '1' : !!process.env.SMTP_HOST,

  // Gli orari dei promemoria sono quelli italiani (anche se il server sta altrove).
  fusoOrario: process.env.FUSO_ORARIO ?? 'Europe/Rome',

  // Notifiche push. Le chiavi si possono dare qui; se mancano il server le crea
  // la prima volta e le salva nel database (tabella impostazione).
  push: {
    chiavePubblica: process.env.VAPID_PUBLIC_KEY ?? '',
    chiavePrivata: process.env.VAPID_PRIVATE_KEY ?? '',
    contatto: process.env.VAPID_SUBJECT ?? 'mailto:avvisi@unicare.app',
  },

  // Interprete: chiave di DeepL (gratuita fino a 500.000 caratteri al mese, finisce con ":fx").
  // Senza chiave, in sviluppo si usa un servizio di prova gratuito; in produzione l'interprete resta spento.
  deeplChiave: process.env.DEEPL_API_KEY ?? '',

  // Limiti contro chi prova a sovraccaricare il server o a creare account in massa.
  limiti: {
    /** Chiamate alle API per indirizzo di rete, al minuto. */
    richiesteMinuto: Number(process.env.LIMITE_RICHIESTE_MINUTO ?? 600),
    /** Nuovi account per indirizzo di rete, all'ora (nei test molti di più). */
    registrazioniOra: Number(process.env.LIMITE_REGISTRAZIONI_ORA ?? (process.env.VITEST ? 1000 : 10)),
  },

  // Il telefono dell'anziano resta collegato a lungo: non deve rifare il codice ogni mese.
  durataTelefonoAnzianoGiorni: 365,
}

if (inProduzione && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET mancante: impostalo prima di avviare in produzione.')
}
