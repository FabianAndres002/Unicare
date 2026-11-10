// Se fai parte di più cerchi, ci ricordiamo su questo dispositivo quale stavi guardando.

const CHIAVE = 'unicare_cerchio'

export function cerchioScelto(): number | null {
  try {
    const v = Number(localStorage.getItem(CHIAVE))
    return v > 0 ? v : null
  } catch {
    return null
  }
}

export function scegliCerchio(id: number): void {
  try {
    localStorage.setItem(CHIAVE, String(id))
  } catch {
    // modalità privata: pazienza, useremo il primo cerchio
  }
}
