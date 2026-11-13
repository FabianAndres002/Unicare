// Il profilo di una badante come lo vede una famiglia (anche come anteprima per la badante).

import { BadgeCheck, Car, Clock, Languages, MapPin } from 'lucide-react'
import type { ProfiloBadante } from '../comune/api'
import Avatar from '../comune/Avatar'
import { DISPONIBILITA, SERVIZI, nomeProvincia, tariffa } from './aspetto'

type Props = { nome: string; cognome: string; p: Omit<ProfiloBadante, 'visibile'>; breve?: boolean }

export default function CartaBadante({ nome, cognome, p, breve }: Props) {
  return (
    <div className="carta-badante">
      <div className="carta-badante-alto">
        <Avatar nome={nome} cognome={cognome} grande />
        <div className="riga-testo">
          <strong className="carta-badante-nome">{nome} {cognome}</strong>
          <span className="con-icona-piccola"><MapPin size={14} /> {p.comune} ({nomeProvincia(p.provincia)})</span>
          <span className="con-icona-piccola"><BadgeCheck size={14} /> {p.anniEsperienza ? `${p.anniEsperienza} ${p.anniEsperienza === 1 ? 'anno' : 'anni'} di esperienza` : 'Prime esperienze'}</span>
        </div>
        {p.tariffaOrariaCentesimi !== null && <span className="carta-badante-tariffa">{tariffa(p.tariffaOrariaCentesimi)}</span>}
      </div>
      {p.presentazione && <p className={`carta-badante-testo ${breve ? 'breve' : ''}`}>{p.presentazione}</p>}
      <div className="chip-elenco">
        {p.disponibilita.map((d) => <span key={d} className="chip forte"><Clock size={13} /> {DISPONIBILITA[d]}</span>)}
        {p.servizi.map((s) => <span key={s} className="chip">{SERVIZI[s]}</span>)}
      </div>
      {!breve && (p.zone || p.lingue || p.automunita) && (
        <ul className="carta-badante-dettagli">
          {p.zone && <li><MapPin size={16} /> Lavora a: {p.zone}</li>}
          {p.lingue && <li><Languages size={16} /> Lingue: {p.lingue}</li>}
          {p.automunita && <li><Car size={16} /> Automunita</li>}
        </ul>
      )}
    </div>
  )
}
