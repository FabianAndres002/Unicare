import { useState } from 'react'
import { api, type Profilo } from '../comune/api'
import Intestazione from './Intestazione'

type Props = {
  profilo: Profilo
  onUscito: () => void
}

// Schermata provvisoria dopo il login. Dalla settimana 3 diventa la dashboard
// della famiglia (creazione del cerchio, profilo dell'anziano, inviti).
export default function Benvenuto({ profilo, onUscito }: Props) {
  const [uscita, setUscita] = useState(false)

  async function esci() {
    setUscita(true)
    try {
      await api.logout()
    } finally {
      onUscito()
    }
  }

  return (
    <main className="pagina">
      <Intestazione sottotitolo={`Ciao ${profilo.nome}!`} />
      <section className="scheda">
        <h2>Sei dentro</h2>
        <p>
          Hai fatto l'accesso come{' '}
          <strong>{profilo.tipo === 'FAMILIARE' ? 'familiare' : 'badante'}</strong> ({profilo.email}).
        </p>
        <p className="nota">Qui arriveranno il tuo cerchio e la scheda della persona che assisti.</p>
      </section>
      <button className="pulsante secondario" type="button" onClick={esci} disabled={uscita}>
        Esci
      </button>
    </main>
  )
}
