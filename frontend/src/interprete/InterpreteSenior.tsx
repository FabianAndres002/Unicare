// Interprete nella Senior App: /senior/interprete. Pulsanti enormi, si sceglie solo la lingua della badante.

import { ArrowLeft } from 'lucide-react'
import { api } from '../comune/api'
import { Collegamento } from '../comune/router'
import Interprete from './Interprete'
import { t } from '../comune/lingua'

export default function InterpreteSenior() {
  return (
    <div className="senior-pagina entra">
      <Collegamento a="/senior" className="senior-indietro"><ArrowLeft size={28} />{' '}{t('Indietro')}</Collegamento>
      <h1>{t('Parla con la badante')}</h1>
      <Interprete grande traduci={async (testo, da, a) => (await api.senior.traduci(testo, da, a)).traduzione} />
    </div>
  )
}
