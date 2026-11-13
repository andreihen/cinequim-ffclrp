import { finite, nonnegative, positive } from './validations'

export interface RateTerm {
  concentration: number
  order: number
}

export function rateConstantUnit(order: number) {
  const exponent = Number((1 - finite(order, 'Ordem global')).toFixed(8))
  if (exponent === 0) return 's⁻¹'
  if (exponent === 1) return 'mol L⁻¹ s⁻¹'
  if (exponent === -1) return 'L mol⁻¹ s⁻¹'
  return 'M^' + (exponent < 0 ? '(' + exponent + ')' : exponent) + ' s⁻¹'
}

export function concentrationProduct(terms: RateTerm[]) {
  if (terms.length === 0) throw new Error('Adicione pelo menos um reagente.')
  let logarithm = 0
  let zero = false
  for (const { concentration, order } of terms) {
    nonnegative(concentration, 'Concentração')
    finite(order, 'Ordem')
    if (concentration === 0) {
      if (order < 0) throw new Error('Uma ordem negativa exige concentração maior que zero.')
      zero ||= order > 0
    } else {
      logarithm += order * Math.log(concentration)
    }
  }
  return zero ? -Infinity : finite(logarithm, 'Produto das concentrações')
}

export function calculateRate(terms: RateTerm[], k: number) {
  const logRate = Math.log(positive(k, 'Constante k')) + concentrationProduct(terms)
  return logRate === -Infinity ? 0 : positive(Math.exp(logRate), 'Velocidade')
}

export function determineK(terms: RateTerm[], rate: number) {
  nonnegative(rate, 'Velocidade observada')
  const logProduct = concentrationProduct(terms)
  if (logProduct === -Infinity || rate === 0) {
    throw new Error('Dados insuficientes para determinar um k positivo. Use uma velocidade positiva e um produto de concentrações diferente de zero.')
  }
  return positive(Math.exp(Math.log(rate) - logProduct), 'Constante k')
}
