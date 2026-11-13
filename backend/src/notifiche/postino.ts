// Il "postino" consegna le email. Ne esistono tre, con la stessa forma:
//
// - SMTP (produzione): se è impostato SMTP_HOST, spedisce davvero (per esempio con Brevo).
// - Cartella (sviluppo): non spedisce nulla. Salva ogni email come pagina .html nella cartella
//   backend/.posta-locale e scrive una riga nel terminale. Si apre con un doppio clic.
// - Memoria (test): tiene le email in un elenco, per controllarle.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { config } from '../config.ts'

export type Email = { a: string; oggetto: string; testo: string; html: string }

export interface Postino {
  invia(email: Email): Promise<void>
}

export function postinoSmtp(): Postino {
  const trasporto = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.porta,
    secure: config.smtp.porta === 465,
    auth: config.smtp.utente ? { user: config.smtp.utente, pass: config.smtp.password } : undefined,
  })
  return {
    async invia(email) {
      await trasporto.sendMail({ from: config.smtp.mittente, to: email.a, subject: email.oggetto, text: email.testo, html: email.html })
    },
  }
}

export function postinoCartella(cartella: string): Postino {
  let progressivo = 0
  return {
    async invia(email) {
      await mkdir(cartella, { recursive: true })
      const ora = new Date().toISOString().replace(/[:.]/g, '-')
      const nome = `${ora}-${++progressivo}-${email.a.replace(/[^a-z0-9]+/gi, '_')}.html`
      const intestazione = `<p style="font:13px sans-serif;color:#666;margin:16px">
        <b>Email di prova (non spedita)</b><br>A: ${email.a}<br>Oggetto: ${email.oggetto}</p>`
      await writeFile(path.join(cartella, nome), intestazione + email.html, 'utf8')
      console.log(`✉  Email a ${email.a}: "${email.oggetto}" (salvata in ${path.join(cartella, nome)})`)
    },
  }
}

export function postinoMemoria(): Postino & { posta: Email[] } {
  const posta: Email[] = []
  return {
    posta,
    async invia(email) {
      posta.push(email)
    },
  }
}

/** Il postino giusto in base alle impostazioni. */
export function postinoPredefinito(): Postino {
  return config.smtp.host ? postinoSmtp() : postinoCartella(config.cartellaPostaLocale)
}
