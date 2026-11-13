// Documenti sanitari dell'anziano: ricette, analisi, ecografie, referti, ricevute.
// Si fa una foto (o si sceglie un PDF), si dà un nome e si ritrova tutto per tipo e per data.
// Li vedono solo familiari e amministratore.

import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Camera, ChevronDown, Download, ExternalLink, FilePlus2, FileText, FolderOpen, Search, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { api, messaggioErrore, scaricaFile, type Anziano, type ArchivioDocumenti, type CategoriaDocumento, type DatiDocumento, type Documento } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { CATEGORIE_DOCUMENTO, ORDINE_CATEGORIE, dataDocumento, dimensione, euro, preparaFile } from './aspetto'

const oggiIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })

/** "12,50" → 1250 centesimi. */
function centesimi(testo: string): number | null {
  const n = Number(testo.replace(/\s|€/g, '').replace(/\./g, '').replace(',', '.'))
  return testo.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}

function NuovoDocumento(props: { anziano: Anziano; serveConsenso: boolean; onFatto: () => void; onAnnulla: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [anteprima, setAnteprima] = useState<string | null>(null)
  const [categoria, setCategoria] = useState<CategoriaDocumento>('PRESCRIZIONE')
  const [titolo, setTitolo] = useState('')
  const [data, setData] = useState(oggiIso)
  const [importo, setImporto] = useState('')
  const [note, setNote] = useState('')
  const [consenso, setConsenso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  useEffect(() => () => { if (anteprima) URL.revokeObjectURL(anteprima) }, [anteprima])

  function scelto(f: File | undefined) {
    if (!f) return
    setFile(f)
    setAnteprima(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
    if (!titolo) setTitolo(f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 120))
  }

  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!file) return setErrore('Fai una foto o scegli un file.')
    setInvio(true)
    setErrore(null)
    try {
      const pronto = await preparaFile(file)
      if (pronto.size > 10 * 1024 * 1024) throw new Error('grande')
      const nome = pronto === file ? file.name : file.name.replace(/\.[a-z0-9]+$/i, '') + '.jpg'
      const dati: DatiDocumento = { categoria, titolo, data, note, importo: categoria === 'RICEVUTA' ? centesimi(importo) : null }
      await api.caricaDocumento(props.anziano.id, pronto, nome, dati, props.serveConsenso)
      props.onFatto()
    } catch (err) {
      setErrore(err instanceof Error && err.message === 'grande' ? 'Il file è troppo grande (massimo 10 MB).' : messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="modulo scheda entra" onSubmit={invia}>
      <div className="scegli-file">
        <label className="pulsante con-icona">
          <Camera size={20} /> Fai una foto
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => scelto(e.target.files?.[0])} />
        </label>
        <label className="pulsante secondario con-icona">
          <Upload size={20} /> Scegli foto o PDF
          <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => scelto(e.target.files?.[0])} />
        </label>
      </div>
      {file && (
        <div className="file-scelto">
          {anteprima ? <img src={anteprima} alt="" /> : <span className="funzione-icona grigio"><FileText size={22} /></span>}
          <span className="riga-testo"><strong>{file.name}</strong><span>{dimensione(file.size)}</span></span>
        </div>
      )}

      <fieldset className="categorie-documento">
        <legend>Che documento è?</legend>
        {ORDINE_CATEGORIE.map((c) => {
          const { nome, Icona, colore } = CATEGORIE_DOCUMENTO[c]
          return (
            <label key={c} className={categoria === c ? 'attiva' : ''}>
              <input type="radio" name="categoria" className="sr-only" checked={categoria === c} onChange={() => setCategoria(c)} />
              <span className={`funzione-icona ${colore}`}><Icona size={18} /></span> {nome}
            </label>
          )
        })}
      </fieldset>

      <label>Nome
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} required minLength={2} maxLength={120}
          placeholder={`Es. ${CATEGORIE_DOCUMENTO[categoria].esempi.split(',')[0]}`} />
      </label>
      <div className="due-colonne">
        <label>Data del documento<input type="date" value={data} max={oggiIso()} onChange={(e) => setData(e.target.value)} required /></label>
        {categoria === 'RICEVUTA' && (
          <label><span>Importo <span className="nota">in euro</span></span>
            <input inputMode="decimal" value={importo} onChange={(e) => setImporto(e.target.value)} placeholder="Es. 36,15" />
          </label>
        )}
      </div>
      <label><span>Note <span className="nota">facoltative</span></span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Es. Da portare alla prossima visita" />
      </label>

      {props.serveConsenso && (
        <label className="consenso">
          <input type="checkbox" checked={consenso} onChange={(e) => setConsenso(e.target.checked)} />
          <span>
            <ShieldCheck size={18} className="icona-inline" />
            <strong>{props.anziano.nome} è d’accordo</strong> che la famiglia conservi qui i suoi documenti sanitari.
            Li vedono solo i familiari, non la badante. Lo chiediamo una volta sola e lo registriamo con la data.
          </span>
        </label>
      )}

      {errore && <p className="errore" role="alert">{errore}</p>}
      <div className="riga-pulsanti">
        <button type="button" className="pulsante fantasma" onClick={props.onAnnulla}>Annulla</button>
        <button className="pulsante" disabled={invio || !file || (props.serveConsenso && !consenso)}>{invio ? 'Carico…' : 'Salva'}</button>
      </div>
    </form>
  )
}

function RigaDocumento({ d, onCambiato }: { d: Documento; onCambiato: () => void }) {
  const [aperto, setAperto] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [conferma, setConferma] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const { nome, Icona, colore } = CATEGORIE_DOCUMENTO[d.categoria]
  const immagine = d.tipoFile.startsWith('image/') && d.tipoFile !== 'image/heic'

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  async function apri() {
    setAperto(!aperto)
    if (url || aperto) return
    try {
      const blob = await scaricaFile(api.fileDocumento(d.id))
      setUrl(URL.createObjectURL(new Blob([blob], { type: d.tipoFile })))
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
  }

  async function elimina() {
    try {
      await api.eliminaDocumento(d.id)
      onCambiato()
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
  }

  return (
    <li className={`documento ${aperto ? 'aperto' : ''}`}>
      <button className="documento-riga" onClick={apri} aria-expanded={aperto}>
        <span className={`funzione-icona ${colore}`}><Icona size={20} /></span>
        <span className="riga-testo">
          <strong>{d.titolo}</strong>
          <span>{dataDocumento(d.data)} · {nome}{d.importoCentesimi !== null ? ` · ${euro(d.importoCentesimi)}` : ''}</span>
        </span>
        <ChevronDown size={20} className="freccia-apri" />
      </button>
      {aperto && (
        <div className="documento-dettaglio entra">
          {!url && !errore && <span className="rotella piccola" aria-label="Caricamento" />}
          {url && immagine && <img src={url} alt={d.titolo} className="documento-immagine" />}
          {url && !immagine && (
            <a className="pulsante secondario con-icona" href={url} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Apri il {d.tipoFile === 'application/pdf' ? 'PDF' : 'file'}</a>
          )}
          {d.note && <p className="appuntamento-note">{d.note}</p>}
          <p className="nota">Caricato da {d.caricatoDa ?? 'qualcuno che non è più nel cerchio'} · {dimensione(d.dimensione)}</p>
          <div className="appuntamento-chi">
            {url && <a className="link con-icona-piccola" href={url} download={d.nomeFile}><Download size={15} /> Scarica</a>}
            {conferma ? (
              <>
                <span>Togliere il documento?</span>
                <button className="pulsante piccolo pericolo" onClick={elimina}>Sì, togli</button>
                <button className="link" onClick={() => setConferma(false)}>No</button>
              </>
            ) : (
              <button className="link tenue con-icona-piccola" onClick={() => setConferma(true)}><Trash2 size={15} /> Togli</button>
            )}
          </div>
          {errore && <p className="errore piccolo">{errore}</p>}
        </div>
      )}
    </li>
  )
}

export default function DocumentiPagina({ anziano }: { anziano: Anziano }) {
  const { dati, errore, ricarica } = useCarica<ArchivioDocumenti>(() => api.documenti(anziano.id), anziano.id, 60)
  const [nuovo, setNuovo] = useState(false)
  const [filtro, setFiltro] = useState<CategoriaDocumento | null>(null)
  const [cerca, setCerca] = useState('')

  const presenti = ORDINE_CATEGORIE.filter((c) => dati?.documenti.some((d) => d.categoria === c))
  const parole = cerca.trim().toLowerCase()
  const visibili = (dati?.documenti ?? []).filter(
    (d) => (!filtro || d.categoria === filtro) && (!parole || `${d.titolo} ${d.note ?? ''}`.toLowerCase().includes(parole)),
  )

  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} /> Home</Collegamento>
      <header className="intestazione-pagina">
        <h1>Documenti di {anziano.nome}</h1>
        <p className="sottotitolo">Ricette, analisi, ecografie e ricevute sempre a portata di mano. Li vedono solo i familiari.</p>
      </header>

      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}

      {dati && (
        <>
          {nuovo ? (
            <NuovoDocumento anziano={anziano} serveConsenso={!dati.consenso} onAnnulla={() => setNuovo(false)}
              onFatto={() => { setNuovo(false); ricarica() }} />
          ) : (
            <button className="pulsante con-icona" onClick={() => setNuovo(true)}><FilePlus2 size={20} /> Aggiungi un documento</button>
          )}

          {dati.speseAnno.centesimi > 0 && (
            <div className="scheda spese-anno">
              <span className="riga-testo"><span>Spese mediche {dati.speseAnno.anno}</span><strong>{euro(dati.speseAnno.centesimi)}</strong></span>
              <span className="nota">Dalle ricevute caricate: utile per la dichiarazione dei redditi.</span>
            </div>
          )}

          {dati.documenti.length > 0 && (
            <section>
              <label className="cerca">
                <Search size={18} />
                <input type="search" placeholder="Cerca un documento" value={cerca} onChange={(e) => setCerca(e.target.value)} aria-label="Cerca un documento" />
              </label>
              <div className="filtri" role="group" aria-label="Filtra per tipo">
                <button className={!filtro ? 'attivo' : ''} onClick={() => setFiltro(null)}>Tutti ({dati.documenti.length})</button>
                {presenti.map((c) => (
                  <button key={c} className={filtro === c ? 'attivo' : ''} onClick={() => setFiltro(filtro === c ? null : c)}>
                    {CATEGORIE_DOCUMENTO[c].nome} ({dati.documenti.filter((d) => d.categoria === c).length})
                  </button>
                ))}
              </div>
            </section>
          )}

          {dati.documenti.length === 0 && !nuovo && (
            <div className="scheda vuoto"><FolderOpen size={28} /><p>Ancora nessun documento. Inizia dall’ultima ricetta o dalle ultime analisi.</p></div>
          )}
          {visibili.length > 0 && (
            <ul className="elenco scheda documenti">
              {visibili.map((d) => <RigaDocumento key={d.id} d={d} onCambiato={ricarica} />)}
            </ul>
          )}
          {dati.documenti.length > 0 && visibili.length === 0 && <p className="nota">Nessun documento trovato.</p>}
        </>
      )}
    </div>
  )
}
