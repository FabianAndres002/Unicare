// Cerchio con le iniziali, colore fisso per persona (finché non ci saranno le foto).
// Il colore dipende solo dal nome, così è uguale ovunque compaia la stessa persona.

const COLORI = ['#5D46EC', '#D9502F', '#8E3B8A', '#3F48CC', '#B23A6B', '#7A4FD0', '#C2452D']

type Props = { nome: string; cognome?: string; grande?: boolean; className?: string }

export default function Avatar({ nome, cognome = '', grande, className = '' }: Props) {
  const iniziali = (nome[0] ?? '') + (cognome[0] ?? '')
  let somma = 0
  for (const c of nome) somma += c.charCodeAt(0)
  return (
    <span
      className={`avatar ${grande ? 'avatar-grande' : ''} ${className}`}
      style={{ background: COLORI[somma % COLORI.length] }}
      aria-hidden="true"
    >
      {iniziali.toUpperCase()}
    </span>
  )
}
