// Il tuo account, i tuoi cerchi (per passare dall'uno all'altro) e il pulsante per uscire.

import { useState } from 'react'
import { Check, CircleHelp, Languages, LogOut, Mail, Plus } from 'lucide-react'
import { apriGuida } from '../comune/guidaEventi'
import { api, messaggioErrore, type Profilo, type RiassuntoCerchio } from '../comune/api'
import { Collegamento } from '../comune/router'
import ScegliFoto from '../comune/ScegliFoto'
import NotificheTelefono from './NotificheTelefono'
import PrivacyProfilo from './PrivacyProfilo'
import TelefonoProfilo from './TelefonoProfilo'
import ScegliLingua from '../comune/ScegliLingua'
import { nomeRuolo } from '../comune/utili'
import { t } from '../comune/lingua'

type Props = {
  profilo: Profilo
  cerchi: RiassuntoCerchio[]
  attivo: number
  onScegli: (id: number) => void
  onEsci: () => void
  onProfilo: (p: Profilo) => void
}

export default function ProfiloPagina({ profilo, cerchi, attivo, onScegli, onEsci, onProfilo }: Props) {
  const [avvisi, setAvvisi] = useState(profilo.emailAvvisi)
  const [errore, setErrore] = useState<string | null>(null)

  async function cambiaAvvisi(attivi: boolean) {
    setAvvisi(attivi)
    setErrore(null)
    try {
      const aggiornato = await api.preferenze({ emailAvvisi: attivi })
      setAvvisi(aggiornato.emailAvvisi)
      onProfilo(aggiornato)
    } catch (e) {
      setAvvisi(!attivi)
      setErrore(messaggioErrore(e))
    }
  }

  return (
    <div className="pagina-app entra">
      <div className="profilo-testa palco-profilo">
        <span className="rete-stella s1" aria-hidden="true" />
        <span className="rete-stella s2" aria-hidden="true" />
        <ScegliFoto nome={profilo.nome} foto={profilo.foto} etichetta={t('la tua foto')}
          onCarica={async (f) => { const { foto } = await api.caricaMiaFoto(f); onProfilo({ ...profilo, foto }) }}
          onTogli={async () => { await api.togliMiaFoto(); onProfilo({ ...profilo, foto: null }) }}
          onDisegno={async (d) => { const { foto } = await api.disegnoMio(d); onProfilo({ ...profilo, foto }) }} />
        <h1>{profilo.nome}</h1>
        <p className="sottotitolo">{profilo.email} · {profilo.tipo === 'FAMILIARE' ? t('familiare') : t('badante')}</p>
      </div>

      <section>
        <div className="titolo-sezione"><h2>{t('I tuoi cerchi')}</h2></div>
        <ul className="elenco scheda">
          {cerchi.map((c) => (
            <li key={c.id}>
              <button className="riga-scelta" onClick={() => onScegli(c.id)}>
                <span className="riga-testo">
                  <strong>{c.nome}</strong>
                  <span>{nomeRuolo[c.mioRuolo]} · {c.numeroMembri === 1 ? t('1 persona') : t('{0} persone', c.numeroMembri)}</span>
                </span>
                {c.id === attivo && <Check size={20} className="spunta" />}
              </button>
            </li>
          ))}
        </ul>
        {profilo.tipo === 'FAMILIARE' && (
          <Collegamento a="/cerchio/nuovo" className="pulsante fantasma con-icona"><Plus size={20} />{' '}{t('Crea un altro cerchio')}</Collegamento>
        )}
      </section>

      <section>
        <div className="titolo-sezione"><h2>{t('Lingua')}</h2></div>
        <div className="scheda profilo-lingua">
          <span className="funzione-icona blu"><Languages size={22} /></span>
          <span className="riga-testo">
            <strong>{t('Lingua dell’app')}</strong>
            <span>{t('Anche i messaggi della chat ti arrivano tradotti in questa lingua.')}</span>
          </span>
          <ScegliLingua salva={(l) => api.preferenze({ lingua: l })} />
        </div>
      </section>

      <section>
        <div className="titolo-sezione"><h2>{t('Avvisi')}</h2></div>
        <NotificheTelefono />
        {profilo.tipo === 'FAMILIARE' && <TelefonoProfilo profilo={profilo} onProfilo={onProfilo} />}
        <label className="scheda interruttore-riga">
          <span className="funzione-icona arancio"><Mail size={22} /></span>
          <span className="riga-testo">
            <strong>{t('Avvisi via email')}</strong>
            <span>{t('Nuove richieste, chi se ne occupa, quando sono fatte')}</span>
          </span>
          <input type="checkbox" role="switch" className="interruttore" checked={avvisi} onChange={(e) => cambiaAvvisi(e.target.checked)} />
        </label>
        {errore && <p className="errore">{errore}</p>}
      </section>

      <button type="button" className="pulsante fantasma con-icona" onClick={apriGuida}><CircleHelp size={20} />{' '}{t('Rivedi la guida')}</button>

      <PrivacyProfilo onEliminato={onEsci} />

      <button className="pulsante secondario con-icona" onClick={onEsci}><LogOut size={20} />{' '}{t('Esci')}</button>
    </div>
  )
}
