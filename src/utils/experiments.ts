export const moduleNames = {
  rate: 'Lei de velocidade',
  experimental: 'Dados experimentais',
  mechanism: 'Mecanismos reacionais',
  integrated: 'Leis integradas',
}

export type ModuleId = keyof typeof moduleNames

export interface Inputs {
  rate: {
    mode: 'rate' | 'k'
    k: string
    rate: string
    reagents: { name: string; concentration: string; order: string }[]
  }
  experimental: { names: string[]; rows: string[][] }
  mechanism: {
    species: { name: string; initial: string }[]
    steps: { reactants: string; products: string; forward: string; reverse: string; reversible: boolean }[]
    duration: string
    relativeTolerance: string
    absoluteTolerance: string
    samples: string
  }
  integrated: { order: '0' | '1' | '2'; initial: string; k: string; time: string }
}

export type Experiment = {
  [K in ModuleId]: { module: K; input: Inputs[K] }
}[ModuleId]

export type RecordEntry = Experiment & { id: string; label: string; date: string }

export const startingInputs: Inputs = {
  rate: {
    mode: 'rate', k: '0,025', rate: '0,00000625',
    reagents: [
      { name: 'A', concentration: '0,10', order: '1' },
      { name: 'B', concentration: '0,05', order: '2' },
    ],
  },
  experimental: {
    names: ['A', 'B'],
    rows: [['0,10', '0,10', '0,002'], ['0,20', '0,10', '0,004'], ['0,10', '0,20', '0,008'], ['0,20', '0,20', '0,016']],
  },
  mechanism: {
    species: [{ name: 'A', initial: '1' }, { name: 'B', initial: '0' }, { name: 'C', initial: '0' }],
    steps: [
      { reactants: 'A', products: 'B', forward: '0,8', reverse: '', reversible: false },
      { reactants: 'B', products: 'C', forward: '0,3', reverse: '', reversible: false },
    ],
    duration: '15', relativeTolerance: '1e-6', absoluteTolerance: '1e-9', samples: '121',
  },
  integrated: { order: '1', initial: '1', k: '0,35', time: '12' },
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const shortText = (value: unknown): value is string => typeof value === 'string' && value.length <= 160
const fields = (value: unknown, keys: string[]) => object(value) && keys.every((key) => shortText(value[key]))
const list = (value: unknown, max: number, check: (entry: unknown) => boolean) =>
  Array.isArray(value) && value.length >= 1 && value.length <= max && value.every(check)
const matrix = (value: unknown, width: number) =>
  list(value, 100, (row) => Array.isArray(row) && row.length === width && row.every(shortText))

export function isExperiment(value: unknown): value is Experiment {
  if (!object(value) || !object(value.input)) return false
  const input = value.input
  switch (value.module) {
    case 'rate':
      return ['rate', 'k'].some((mode) => mode === input.mode) && fields(input, ['k', 'rate']) &&
        list(input.reagents, 12, (row) => fields(row, ['name', 'concentration', 'order']))
    case 'experimental':
      return list(input.names, 8, shortText) && Array.isArray(input.names) && matrix(input.rows, input.names.length + 1)
    case 'mechanism':
      return fields(input, ['duration', 'relativeTolerance', 'absoluteTolerance', 'samples']) &&
        list(input.species, 12, (row) => fields(row, ['name', 'initial'])) &&
        list(input.steps, 24, (row) => object(row) && typeof row.reversible === 'boolean' &&
          fields(row, ['reactants', 'products', 'forward', 'reverse']))
    case 'integrated':
      return ['0', '1', '2'].some((order) => order === input.order) && fields(input, ['initial', 'k', 'time'])
    default: return false
  }
}

export function isRecord(value: unknown): value is RecordEntry {
  return isExperiment(value) && fields(value, ['id', 'label', 'date']) &&
    Number.isFinite(Date.parse((value as RecordEntry).date))
}

export function serializeExperiment(experiment: Experiment) {
  return JSON.stringify({ format: 'CineQUIM - FFCLRP', version: 1, experiment }, null, 2)
}

export async function readExperiment(file: File): Promise<Experiment> {
  if (file.size > 200_000) throw new Error('O arquivo JSON deve ter até 200 KB.')
  let value: unknown
  try { value = JSON.parse(await file.text()) } catch { throw new Error('O arquivo não contém JSON válido.') }
  if (!object(value) || (value.format !== 'CineQUIM - FFCLRP' && value.format !== 'CineLab') || value.version !== 1 || !isExperiment(value.experiment)) {
    throw new Error('Formato incompatível. Selecione um experimento exportado pelo CineQUIM - FFCLRP (versão 1).')
  }
  return value.experiment
}

export function download(content: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function csv(rows: (string | number)[][]) {
  const encode = (value: string | number) => {
    if (typeof value === 'number') return String(value).replace('.', ',')
    const safe = /^\s*[=+\-@\t\r]/.test(value) ? "'" + value : value
    return '"' + safe.replaceAll('"', '""') + '"'
  }
  return '\uFEFF' + rows.map((row) => row.map(encode).join(';')).join('\r\n')
}
