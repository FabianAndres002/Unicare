// Etichette di servizi, disponibilità e province per la sezione badanti.

import type { Disponibilita, Servizio } from '../comune/api'

export const SERVIZI: Record<Servizio, string> = {
  COMPAGNIA: 'Compagnia',
  IGIENE: 'Igiene personale',
  PASTI: 'Pasti',
  PULIZIE: 'Pulizie di casa',
  SPESA: 'Spesa e commissioni',
  ACCOMPAGNAMENTO: 'Accompagnamento a visite',
  FARMACI: 'Ricordare i farmaci',
  NOTTE: 'Assistenza notturna',
}

export const DISPONIBILITA: Record<Disponibilita, string> = {
  CONVIVENTE: 'Convivente',
  A_ORE: 'A ore',
  NOTTE: 'Di notte',
  WEEKEND: 'Nel weekend',
}

export const PROVINCE: [string, string][] = Object.entries({
  AG: 'Agrigento', AL: 'Alessandria', AN: 'Ancona', AO: 'Aosta', AP: 'Ascoli Piceno', AQ: "L'Aquila", AR: 'Arezzo', AT: 'Asti',
  AV: 'Avellino', BA: 'Bari', BG: 'Bergamo', BI: 'Biella', BL: 'Belluno', BN: 'Benevento', BO: 'Bologna', BR: 'Brindisi',
  BS: 'Brescia', BT: 'Barletta-Andria-Trani', BZ: 'Bolzano', CA: 'Cagliari', CB: 'Campobasso', CE: 'Caserta', CH: 'Chieti',
  CL: 'Caltanissetta', CN: 'Cuneo', CO: 'Como', CR: 'Cremona', CS: 'Cosenza', CT: 'Catania', CZ: 'Catanzaro', EN: 'Enna',
  FC: 'Forlì-Cesena', FE: 'Ferrara', FG: 'Foggia', FI: 'Firenze', FM: 'Fermo', FR: 'Frosinone', GE: 'Genova', GO: 'Gorizia',
  GR: 'Grosseto', IM: 'Imperia', IS: 'Isernia', KR: 'Crotone', LC: 'Lecco', LE: 'Lecce', LI: 'Livorno', LO: 'Lodi', LT: 'Latina',
  LU: 'Lucca', MB: 'Monza e Brianza', MC: 'Macerata', ME: 'Messina', MI: 'Milano', MN: 'Mantova', MO: 'Modena', MS: 'Massa-Carrara',
  MT: 'Matera', NA: 'Napoli', NO: 'Novara', NU: 'Nuoro', OR: 'Oristano', PA: 'Palermo', PC: 'Piacenza', PD: 'Padova',
  PE: 'Pescara', PG: 'Perugia', PI: 'Pisa', PN: 'Pordenone', PO: 'Prato', PR: 'Parma', PT: 'Pistoia', PU: 'Pesaro e Urbino',
  PV: 'Pavia', PZ: 'Potenza', RA: 'Ravenna', RC: 'Reggio Calabria', RE: 'Reggio Emilia', RG: 'Ragusa', RI: 'Rieti', RM: 'Roma',
  RN: 'Rimini', RO: 'Rovigo', SA: 'Salerno', SI: 'Siena', SO: 'Sondrio', SP: 'La Spezia', SR: 'Siracusa', SS: 'Sassari',
  SU: 'Sud Sardegna', SV: 'Savona', TA: 'Taranto', TE: 'Teramo', TN: 'Trento', TO: 'Torino', TP: 'Trapani', TR: 'Terni',
  TS: 'Trieste', TV: 'Treviso', UD: 'Udine', VA: 'Varese', VB: 'Verbano-Cusio-Ossola', VC: 'Vercelli', VE: 'Venezia',
  VI: 'Vicenza', VR: 'Verona', VT: 'Viterbo', VV: 'Vibo Valentia',
}).sort((a, b) => a[1].localeCompare(b[1], 'it'))

export const nomeProvincia = (sigla: string) => PROVINCE.find(([s]) => s === sigla)?.[1] ?? sigla

export const tariffa = (centesimi: number | null) =>
  centesimi === null ? null : `${(centesimi / 100).toLocaleString('it-IT', { minimumFractionDigits: centesimi % 100 ? 2 : 0 })} €/ora`
