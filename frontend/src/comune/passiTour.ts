// I passi della visita guidata: per ogni pagina, quali pulsanti illuminare e cosa dire.
// "dove" è un selettore CSS: se sullo schermo non c'è (per esempio la scheda del nonno
// quando non l'avete ancora creata), quel passo si salta da solo.
// Senza "dove" il fumetto sta al centro dello schermo.

import { t } from './lingua'

export type TipoGuida = 'FAMILIARE' | 'BADANTE' | 'SENIOR'

export type Passo = {
  /** La pagina su cui mostrarlo. */
  pagina: string
  dove?: string
  titolo: string
  testo: string
  /** L'ultimo passo: come mettere l'app sulla schermata Home. */
  installa?: boolean
}

const nav = (a: string) => `.navigazione a[href="${a}"]`

function famiglia(): Passo[] {
  return [
    { pagina: '/', titolo: t('Benvenuto in Unicare'), testo: t('Ti faccio vedere come funziona, pulsante per pulsante. Ci vogliono due minuti e puoi uscire quando vuoi con “Salta”.') },
    { pagina: '/', dove: '.scheda-anziano', titolo: t('La scheda del vostro caro'), testo: t('Foto, età e comune della persona che assistete. La matita in alto a destra serve per modificarla.') },
    { pagina: '/', dove: '.scheda-anziano-basso > :nth-child(1)', titolo: t('Le medicine di oggi'), testo: t('Quante medicine ha già preso oggi. Toccalo per scegliere gli orari (mattino, pranzo, sera) e i nomi delle medicine.') },
    { pagina: '/', dove: '.scheda-anziano-basso > :nth-child(2)', titolo: t('La prossima visita'), testo: t('Il prossimo appuntamento dal medico o per un esame. Toccalo per aggiungerne uno.') },
    { pagina: '/', dove: '.scheda-anziano-basso > :nth-child(3)', titolo: t('Richieste attive'), testo: t('Quante richieste di aiuto sono aperte o in corso per lui o per lei.') },
    { pagina: '/', dove: '.scheda-anziano-telefono', titolo: t('Il suo telefono'), testo: t('Da qui colleghi il telefono del vostro caro alla Senior App, con un codice di 6 numeri: niente email né password.') },
    { pagina: '/', dove: '.cambia-anziano', titolo: t('Più persone da assistere'), testo: t('Tocca qui per passare all’altra persona: la Home mostra le sue medicine, le sue visite e le sue richieste.') },
    { pagina: '/', dove: '.aggiungi-persona', titolo: t('Aggiungi un’altra persona'), testo: t('Se assistete anche un altro nonno o un’altra nonna, aggiungilo qui.') },
    { pagina: '/', dove: '.chiedi-aiuto', titolo: t('Chiedi aiuto al cerchio'), testo: t('Serve la spesa, un farmaco, un passaggio? Scrivilo qui: arriva una notifica a tutti e chi può risponde “Me ne occupo io”.') },
    { pagina: '/', dove: '.griglia-funzioni a[href$="/appuntamenti"]', titolo: t('Appuntamenti'), testo: t('Il calendario di visite ed esami. Chi accompagna tocca “Ci vado io”; la sera prima arriva un promemoria.') },
    { pagina: '/', dove: '.griglia-funzioni a[href$="/messaggi"]', titolo: t('Messaggi vocali'), testo: t('Il vostro caro parla invece di scrivere. Qui li ascolti e rispondi con la voce.') },
    { pagina: '/', dove: '.griglia-funzioni a[href="/badanti"]', titolo: t('Trova una badante'), testo: t('Le badanti della vostra zona che si propongono. Puoi scrivere loro: i messaggi vengono tradotti.') },
    { pagina: '/', dove: '.griglia-funzioni a[href$="/documenti"]', titolo: t('Documenti'), testo: t('Ricette, analisi, ecografie, ricevute: tutto in un posto, sempre a portata di mano.') },
    { pagina: '/', dove: '.griglia-funzioni a[href="/interprete"]', titolo: t('Interprete'), testo: t('Per parlare a voce con la badante nella sua lingua: il telefono ascolta, traduce e legge ad alta voce.') },
    { pagina: '/richieste', dove: nav('/richieste'), titolo: t('Richieste'), testo: t('Qui trovi tutte le richieste di aiuto del cerchio.') },
    { pagina: '/richieste', dove: '.richieste-conti', titolo: t('A colpo d’occhio'), testo: t('Quante sono da fare, quante sono in corso e quante sono già state fatte.') },
    { pagina: '/richieste', dove: '.richieste-nuova', titolo: t('Nuova richiesta'), testo: t('Per chiedere aiuto agli altri del cerchio.') },
    { pagina: '/richieste', dove: '.schede-vista', titolo: t('Attive e concluse'), testo: t('In “Attive” quelle da fare o in corso, in “Concluse” quelle finite o annullate.') },
    { pagina: '/cerchio', dove: nav('/cerchio'), titolo: t('Il cerchio'), testo: t('Le persone che si prendono cura insieme: familiari, badante e, al centro, chi assistete.') },
    { pagina: '/cerchio', dove: '.rete', titolo: t('Tocca una persona'), testo: t('Tocca una foto per vedere chi è, il suo ruolo e cosa puoi fare. Le linee tratteggiate sono inviti non ancora accettati.') },
    { pagina: '/invita', dove: nav('/invita'), titolo: t('Invita'), testo: t('Per far entrare nel cerchio un altro familiare o la badante.') },
    { pagina: '/invita', dove: 'form.modulo', titolo: t('Crea il link d’invito'), testo: t('Scrivi la sua email e scegli il ruolo: ricevi un link da mandare su WhatsApp. Con quel link entra direttamente nel vostro cerchio.') },
    { pagina: '/profilo', dove: nav('/profilo'), titolo: t('Profilo'), testo: t('Le tue impostazioni.') },
    { pagina: '/profilo', dove: '.notifiche-riga', titolo: t('Accendi le notifiche'), testo: t('Importante: accendile qui, così sai subito quando c’è bisogno di te. Con “Manda una notifica di prova” controlli che arrivino.') },
    { pagina: '/profilo', dove: '.telefono-profilo', titolo: t('Il tuo numero'), testo: t('Se lo scrivi, il vostro caro può chiamarti con un pulsante grande dalla Senior App.') },
    { pagina: '/profilo', dove: '.rivedi-guida', titolo: t('Rivedi la guida'), testo: t('Se ti dimentichi qualcosa, da qui rifai questo giro quando vuoi.') },
  ]
}

function badante(): Passo[] {
  return [
    { pagina: '/', titolo: t('Benvenuto in Unicare'), testo: t('Ti faccio vedere come funziona, pulsante per pulsante. Ci vogliono due minuti e puoi uscire quando vuoi con “Salta”.') },
    // Badante senza cerchio: la Home è il lavoro.
    { pagina: '/', dove: '.pagina-app a[href="/lavoro/profilo"]', titolo: t('Il tuo profilo'), testo: t('Compila il profilo e accendi “Mi propongo”: le famiglie della tua zona ti trovano e ti scrivono.') },
    { pagina: '/', dove: '.pagina-app a.riga-cerchio[href="/lavoro"]', titolo: t('Famiglie che cercano'), testo: t('Le famiglie che stanno cercando una badante: puoi proporti con un tocco.') },
    { pagina: '/', dove: '.pagina-app a[href="/interprete"]', titolo: t('Interprete'), testo: t('Per parlare a voce con la famiglia: il telefono ascolta, traduce e legge ad alta voce.') },
    // Badante in un cerchio: la Home della famiglia.
    { pagina: '/', dove: '.scheda-anziano', titolo: t('La persona che assisti'), testo: t('Le sue medicine di oggi, la prossima visita e le richieste aperte.') },
    { pagina: '/', dove: '.chiedi-aiuto', titolo: t('Chiedi aiuto al cerchio'), testo: t('Serve qualcosa? Scrivilo qui: la famiglia riceve una notifica.') },
    { pagina: '/', dove: '.griglia-funzioni a[href$="/appuntamenti"]', titolo: t('Appuntamenti'), testo: t('Le visite e gli esami. Se accompagni tu, tocca “Ci vado io”.') },
    { pagina: '/', dove: '.griglia-funzioni a[href$="/messaggi"]', titolo: t('Messaggi vocali'), testo: t('I messaggi a voce della persona che assisti e della famiglia.') },
    { pagina: '/richieste', dove: nav('/richieste'), titolo: t('Richieste'), testo: t('Le richieste di aiuto della famiglia. Se puoi, tocca “Me ne occupo io”: tutti sapranno che ci pensi tu.') },
    { pagina: '/contatti', dove: nav('/contatti'), titolo: t('Messaggi'), testo: t('Le famiglie che ti hanno scritto. Scrivi nella tua lingua: i messaggi arrivano tradotti.') },
    { pagina: '/lavoro', dove: nav('/lavoro'), titolo: t('Lavoro'), testo: t('Il tuo profilo, le tue proposte e le famiglie che cercano.') },
    { pagina: '/profilo', dove: nav('/profilo'), titolo: t('Profilo'), testo: t('Le tue impostazioni.') },
    { pagina: '/profilo', dove: '.notifiche-riga', titolo: t('Accendi le notifiche'), testo: t('Importante: accendile qui, così sai subito quando c’è bisogno di te. Con “Manda una notifica di prova” controlli che arrivino.') },
    { pagina: '/profilo', dove: '.rivedi-guida', titolo: t('Rivedi la guida'), testo: t('Se ti dimentichi qualcosa, da qui rifai questo giro quando vuoi.') },
  ]
}

function senior(): Passo[] {
  return [
    { pagina: '/senior', titolo: t('Benvenuto in Unicare'), testo: t('Ti faccio vedere i pulsanti uno per uno. Tocca “Avanti” per andare avanti.') },
    { pagina: '/senior', dove: '.senior-persone', titolo: t('Chi sta usando il telefono?'), testo: t('Se usate in due questo telefono, tocca il tuo nome qui in alto.') },
    { pagina: '/senior', dove: '.senior-chiedi', titolo: t('Chiedi aiuto'), testo: t('Tocca qui quando ti serve qualcosa: la spesa, la farmacia, un passaggio. La tua famiglia riceve subito l’avviso.') },
    { pagina: '/senior', dove: '.senior-chiamate', titolo: t('Chiama la famiglia'), testo: t('Tocca un nome per telefonare subito.') },
    { pagina: '/senior', dove: '.senior-messaggi', titolo: t('Messaggi a voce'), testo: t('Qui ascolti i messaggi della famiglia e mandi i tuoi: tocca e parla, non serve scrivere.') },
    { pagina: '/senior', dove: '.senior-interprete', titolo: t('Parla con la badante'), testo: t('Se la badante parla un’altra lingua: tu parli, il telefono traduce per lei.') },
    { pagina: '/senior', dove: '.senior-medicine-oggi', titolo: t('Le medicine di oggi'), testo: t('Quando è l’ora il telefono suona. Prendi le medicine e tocca il pulsante verde “Fatto”.') },
    { pagina: '/senior', dove: '.senior-notifiche', titolo: t('Fai suonare il telefono'), testo: t('Tocca qui per far suonare il telefono per le medicine e quando qualcuno ti risponde.') },
    { pagina: '/senior', dove: '.senior-112', titolo: t('Emergenza'), testo: t('Il pulsante rosso in basso chiama il 118. C’è sempre, in ogni pagina.') },
  ]
}

export function passiTour(tipo: TipoGuida, installata: boolean): Passo[] {
  const elenco = tipo === 'SENIOR' ? senior() : tipo === 'BADANTE' ? badante() : famiglia()
  const casa = tipo === 'SENIOR' ? '/senior' : '/'
  if (!installata) elenco.push({ pagina: casa, titolo: t('Mettila sulla schermata Home'), testo: '', installa: true })
  elenco.push({ pagina: casa, titolo: t('Fatto!'), testo: tipo === 'SENIOR'
    ? t('Adesso sai tutto. Se ti serve, rivedi questo giro in fondo alla pagina.')
    : t('Adesso sai dove trovare tutto. Puoi rifare questo giro dal Profilo, alla voce “Rivedi la guida”.') })
  return elenco
}
