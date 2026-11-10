export default function Intestazione({ sottotitolo }: { sottotitolo: string }) {
  return (
    <header className="intestazione">
      <img className="logo" src="/icone/icona-192.png" alt="" width={64} height={64} />
      <h1>Unicare</h1>
      <p className="sottotitolo">{sottotitolo}</p>
    </header>
  )
}
