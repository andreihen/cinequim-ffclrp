import { solveODE, type SolverOptions } from './numericalSolver'
import { nonnegative, positive, speciesNames } from './validations'

export interface ElementaryStep {
  reactants: string
  products: string
  forward: number
  reverse?: number
}

/** Parse positive integer coefficients and species separated by plus signs with surrounding spaces. */
export function parseSide(side: string, names: string[]) {
  if (side.trim() === '0') return names.map(() => 0)
  const result = names.map(() => 0)
  for (const term of side.trim().split(/\s+\+\s+/)) {
    const match = /^(\d+)\s+(.+)$/.exec(term)
    const name = match ? match[2] : term
    const coefficient = match ? Number(match[1]) : 1
    const index = names.indexOf(name)
    if (index < 0 || !Number.isInteger(coefficient) || coefficient < 1 || coefficient > 20) {
      throw new Error('Termo inválido: “' + term + '”. Use espécies cadastradas e o formato “2 A + B” ou “0”.')
    }
    result[index] += coefficient
  }
  return result
}

export function simulateMechanism(
  species: { name: string; initial: number }[], steps: ElementaryStep[], duration: number, options: SolverOptions,
) {
  const names = speciesNames(species.map(({ name }) => name))
  const initial = species.map(({ initial }) => nonnegative(initial, 'Concentração inicial'))
  if (steps.length < 1 || steps.length > 24) throw new Error('Informe de 1 a 24 etapas.')
  const model = steps.map((step, index) => {
    const left = parseSide(step.reactants, names)
    const right = parseSide(step.products, names)
    const change = right.map((count, i) => count - left[i])
    if (change.every((count) => count === 0)) throw new Error('A etapa ' + (index + 1) + ' não altera o mecanismo.')
    return {
      left, right, change,
      kf: positive(step.forward, 'Constante direta da etapa ' + (index + 1)),
      kr: step.reverse === undefined ? 0 : positive(step.reverse, 'Constante inversa da etapa ' + (index + 1)),
    }
  })
  const massAction = (counts: number[], concentrations: number[], k: number) => counts.reduce(
    (rate, count, i) => count === 0 ? rate : rate * Math.max(0, concentrations[i]) ** count, k,
  )
  const derivative = (concentrations: number[]) => {
    const rates = names.map(() => 0)
    for (const { left, right, change, kf, kr } of model) {
      const flux = massAction(left, concentrations, kf) - (kr === 0 ? 0 : massAction(right, concentrations, kr))
      change.forEach((count, i) => {
        if (count !== 0) rates[i] += count * flux
      })
    }
    return rates
  }
  return { names, model, ...solveODE(derivative, initial, duration, options) }
}
