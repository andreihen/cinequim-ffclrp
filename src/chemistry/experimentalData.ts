import { calculateRate, rateConstantUnit } from './rateLaws'
import { finite, positive } from './validations'

const dot = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + value * b[i], 0)
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

/** Least squares with centered, scaled predictors and reorthogonalized modified Gram–Schmidt QR. */
export function fitLinear(predictors: number[][], response: number[]) {
  const rows = response.length
  const columns = predictors.length
  if (columns === 0 || rows <= columns || predictors.some((column) => column.length !== rows)) {
    throw new Error('Dados insuficientes para ajustar todos os parâmetros.')
  }
  response.forEach((value) => finite(value, 'Resposta'))
  const centers = predictors.map((column) => mean(column.map((value) => finite(value, 'Variável'))))
  const q: number[][] = []
  const r = Array.from({ length: columns }, () => Array<number>(columns).fill(0))
  const scales: number[] = []

  predictors.forEach((column, j) => {
    let vector = column.map((value) => value - centers[j])
    const scale = Math.sqrt(dot(vector, vector))
    if (!Number.isFinite(scale) || scale === 0) {
      throw new Error('Dados insuficientes: varie independentemente cada variável experimental.')
    }
    scales.push(scale)
    vector = vector.map((value) => value / scale)
    for (let pass = 0; pass < 2; pass++) {
      q.forEach((basis, i) => {
        const projection = dot(basis, vector)
        r[i][j] += projection
        vector = vector.map((value, index) => value - projection * basis[index])
      })
    }
    const norm = Math.sqrt(dot(vector, vector))
    if (norm < 1e-9) throw new Error('Dados insuficientes: há variáveis dependentes entre si. Varie as concentrações independentemente.')
    r[j][j] = norm
    q.push(vector.map((value) => value / norm))
  })

  const responseMean = mean(response)
  const centered = response.map((value) => value - responseMean)
  const scaledCoefficients = q.map((basis) => dot(basis, centered))
  for (let i = columns - 1; i >= 0; i--) {
    for (let j = i + 1; j < columns; j++) scaledCoefficients[i] -= r[i][j] * scaledCoefficients[j]
    scaledCoefficients[i] /= r[i][i]
  }
  const coefficients = scaledCoefficients.map((value, index) => value / scales[index])
  const intercept = responseMean - dot(coefficients, centers)
  const predicted = response.map((_, row) => intercept + coefficients.reduce(
    (sum, value, index) => sum + value * predictors[index][row], 0,
  ))
  const residuals = response.map((value, index) => value - predicted[index])
  const total = dot(centered, centered)
  const sumSquaredErrors = dot(residuals, residuals)
  return {
    intercept, coefficients, predicted, residuals,
    rSquared: total === 0 ? null : 1 - sumSquaredErrors / total,
    residualDegrees: rows - columns - 1,
  }
}

export interface RateObservation {
  concentrations: number[]
  rate: number
}

export function fitRateLaw(observations: RateObservation[], speciesCount: number) {
  if (!Number.isInteger(speciesCount) || speciesCount < 1 || observations.some((row) => row.concentrations.length !== speciesCount)) {
    throw new Error('Cada ensaio precisa informar a concentração de todos os reagentes.')
  }
  const predictors = Array.from({ length: speciesCount }, (_, index) =>
    observations.map((row) => Math.log(positive(row.concentrations[index], 'Concentração experimental'))),
  )
  const fit = fitLinear(predictors, observations.map((row) => Math.log(positive(row.rate, 'Velocidade experimental'))))
  const k = positive(Math.exp(fit.intercept), 'Constante k')
  const totalOrder = fit.coefficients.reduce((sum, value) => sum + value, 0)
  const fittedRates = observations.map((row) => calculateRate(
    row.concentrations.map((concentration, index) => ({ concentration, order: fit.coefficients[index] })), k,
  ))
  return { ...fit, orders: fit.coefficients, k, totalOrder, unit: rateConstantUnit(totalOrder), fittedRates }
}
