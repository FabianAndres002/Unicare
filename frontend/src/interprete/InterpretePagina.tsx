// Interprete per familiari e badanti: /interprete

import { ArrowLeft, Languages, ShieldCheck } from 'lucide-react'
import { api } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import Interprete from './Interprete'
import { t } from '../comune/lingua'

export default function InterpretePagina({ badante }: { badante: boolean }) {
  const { dati, errore } = useCarica(() => api.interprete(), 'interprete', 3600)
  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} />{' '}{t('Home')}</Collegamento>
      <header className="palco-pagina cat-casa">
        <span className="palco-icona"><Languages size={26} /></span>
        <div className="palco-testi">
          <h1>{t('Interprete')}</h1>
          <p className="sottotitolo">{badante
            ? t('Ognuno parla nella sua lingua: il telefono traduce e legge ad alta voce.')
            : t('Ognuno parla nella sua lingua: il telefono traduce e legge ad alta voce.')}</p>
        </div>
      </header>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label={t('Caricamento')} />}
      {dati && !dati.disponibile && <p className="scheda">{t('L’interprete non è ancora attivo: manca la chiave del servizio di traduzione sul server.')}</p>}
      {dati?.disponibile && (
        <>
          <Interprete traduci={async (testo, da, a) => (await api.traduci(testo, da, a)).traduzione}
            predefinite={badante ? { mia: 'ro', altra: 'it' } : { mia: 'it', altra: 'ro' }} />
          <p className="nota"><ShieldCheck size={15} className="icona-inline" />{' '}{t('Le frasi vengono tradotte da {0} e non vengono salvate. Non dire dati che non vuoi far uscire dal telefono.', dati.servizio)}</p>
        </>
      )}
    </div>
  )
}
