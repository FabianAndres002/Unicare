// La faccia di una persona: la sua foto se l'ha messa, altrimenti un cerchio con le iniziali.
// Il colore delle iniziali dipende solo dal nome, così è uguale ovunque compaia la stessa persona.

const COLORI = ['#5D46EC', '#D9502F', '#8E3B8A', '#3F48CC', '#B23A6B', '#7A4FD0', '#C2452D']

type Props = { nome: string; cognome?: string; foto?: string | null; grande?: boolean; className?: string }

export default function Avatar({ nome, cognome = '', foto, grande, className = '' }: Props) {
  const iniziali = (nome[0] ?? '') + (cognome[0] ?? '')
  let somma = 0
  for (const c of nome) somma += c.charCodeAt(0)
  return (
    <span
      className={`avatar ${grande ? 'avatar-grande' : ''} ${foto ? 'con-foto' : ''} ${className}`}
      style={{ background: COLORI[somma % COLORI.length] }}
      aria-hidden="true"
    >
      {foto ? <img src={foto} alt="" loading="lazy" decoding="async" /> : iniziali.toUpperCase()}
    </span>
  )
}
