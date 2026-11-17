// Per riaprire la guida da qualsiasi schermata (Profilo, Senior App).
export const EVENTO_GUIDA = 'unicare-apri-guida'
export const apriGuida = () => window.dispatchEvent(new Event(EVENTO_GUIDA))
