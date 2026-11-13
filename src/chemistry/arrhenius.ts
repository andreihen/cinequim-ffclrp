import { fitLinear } from './experimentalData'
import { finite, positive } from './validations'

export const GAS_CONSTANT = 8.31446261815324

export function arrheniusRate(prefactor: number, activationKJ: number, kelvin: number) {
  positive(prefactor, 'Fator pré-exponencial')
  finite(activationKJ, 'Energia de ativação')
  positive(kelvin, 'Temperatura absoluta')
  return positive(Math.exp(Math.log(prefactor) - (activationKJ / kelvin) * (1000 / GAS_CONSTANT)), 'Constante k')
}

export function fitArrhenius(rows: { kelvin: number; k: number }[]) {
  const inverse = rows.map(({ kelvin }) => 1 / positive(kelvin, 'Temperatura absoluta'))
  const fit = fitLinear([inverse], rows.map(({ k }) => Math.log(positive(k, 'Constante k'))))
  const activationKJ = finite(-fit.coefficients[0] * (GAS_CONSTANT / 1000), 'Energia de ativação')
  const prefactor = positive(Math.exp(fit.intercept), 'Fator pré-exponencial')
  return { ...fit, activationKJ, prefactor }
}

export function kelvinFrom(value: number, unit: 'K' | 'C') {
  return positive(unit === 'C' ? value + 273.15 : value, 'Temperatura absoluta')
}
