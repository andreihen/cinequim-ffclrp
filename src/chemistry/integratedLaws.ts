import { nonnegative, positive } from './validations'

export type IntegratedOrder = 0 | 1 | 2

export function concentrationAt(order: IntegratedOrder, initial: number, k: number, time: number) {
  positive(initial, 'Concentração inicial')
  positive(k, 'Constante k')
  nonnegative(time, 'Tempo')
  switch (order) {
    case 0: return Math.max(0, initial - k * time)
    case 1: return initial * Math.exp(-k * time)
    case 2: return 1 / (1 / initial + k * time)
    default: throw new Error('Selecione uma ordem de 0, 1 ou 2.')
  }
}

export function halfLife(order: IntegratedOrder, initial: number, k: number) {
  positive(initial, 'Concentração inicial')
  positive(k, 'Constante k')
  switch (order) {
    case 0: return positive(initial / k / 2, 'Meia-vida')
    case 1: return positive(Math.LN2 / k, 'Meia-vida')
    case 2: return positive(1 / initial / k, 'Meia-vida')
    default: throw new Error('Selecione uma ordem de 0, 1 ou 2.')
  }
}
