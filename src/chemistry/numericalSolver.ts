import { positive } from './validations'

const a = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
]
const b4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40]

export interface SolverOptions {
  relativeTolerance: number
  absoluteTolerance: number
  samples: number
}

/** Autonomous Dormand–Prince 5(4), stepping exactly to each requested output time. */
export function solveODE(
  derivative: (state: number[]) => number[], initial: number[], duration: number, options: SolverOptions,
) {
  positive(duration, 'Duração')
  const rtol = positive(options.relativeTolerance, 'Tolerância relativa')
  const atol = positive(options.absoluteTolerance, 'Tolerância absoluta')
  const { samples } = options
  if (!Number.isInteger(samples) || samples < 2 || samples > 1001) throw new Error('Use entre 2 e 1001 pontos.')
  const interval = duration / (samples - 1)
  let time = 0
  let state = [...initial]
  let step = interval
  let accepted = 0
  let rejected = 0
  const points = [{ time, values: state }]

  for (let point = 1; point < samples; point++) {
    const target = point === samples - 1 ? duration : interval * point
    while (time < target) {
      if (accepted + rejected >= 15000) {
        throw new Error('O integrador atingiu o limite de passos. Reduza a duração ou a separação entre as escalas de tempo.')
      }
      const remaining = target - time
      const h = Math.min(step, remaining)
      if (h <= 0 || time + h === time) throw new Error('O passo ficou abaixo da resolução numérica.')
      const stages: number[][] = []
      const advance = (weights: number[]) => state.map((value, index) => value + h * weights.reduce(
        (sum, weight, stage) => sum + weight * stages[stage][index], 0,
      ))
      let next = state
      for (const weights of a) {
        next = advance(weights)
        stages.push(derivative(next))
      }
      const low = advance(b4)
      let error = 0
      next.forEach((value, i) => {
        const localTolerance = atol + rtol * Math.max(Math.abs(state[i]), Math.abs(value))
        error = Math.max(error, Math.abs(value - low[i]) / localTolerance, -value / atol)
      })
      if (!Number.isFinite(error)) error = Infinity
      if (error <= 1) {
        state = next.map((value) => Math.max(0, value))
        time = h === remaining ? target : time + h
        accepted++
      } else {
        rejected++
      }
      step = h * Math.min(5, Math.max(0.1, 0.9 * error ** (-1 / 5)))
    }
    points.push({ time: target, values: state })
  }
  return { points, accepted, rejected }
}
