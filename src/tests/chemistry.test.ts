import { describe, expect, it } from 'vitest'
import { fitRateLaw } from '../chemistry/experimentalData'
import { concentrationAt, halfLife } from '../chemistry/integratedLaws'
import { calculateRate, determineK, rateConstantUnit } from '../chemistry/rateLaws'
import { parseSide, simulateMechanism } from '../chemistry/reactionMechanisms'
import { numberFrom } from '../chemistry/validations'
import { isExperiment, readExperiment, serializeExperiment, startingInputs } from '../utils/experiments'
import { calculate } from '../utils/results'

describe('leis de velocidade', () => {
  it('calcula v, recupera k e calcula as unidades por ordem global', () => {
    const terms = [{ concentration: 0.1, order: 1 }, { concentration: 0.05, order: 2 }]
    expect(calculateRate(terms, 0.025)).toBeCloseTo(0.00000625, 13)
    expect(determineK(terms, 0.00000625)).toBeCloseTo(0.025, 12)
    expect([0, 1, 2, 3, 0.5].map(rateConstantUnit)).toEqual([
      'mol L⁻¹ s⁻¹', 's⁻¹', 'L mol⁻¹ s⁻¹', 'M^(-2) s⁻¹', 'M^0.5 s⁻¹',
    ])
  })
  it('trata ordem zero, concentração zero e dados insuficientes para k', () => {
    expect(calculateRate([{ concentration: 0, order: 0 }], 2)).toBe(2)
    expect(calculateRate([{ concentration: 0, order: 0.5 }], 2)).toBe(0)
    expect(() => calculateRate([{ concentration: 0, order: -1 }], 2)).toThrow(/negativa/)
    expect(() => determineK([{ concentration: 0, order: 1 }], 0)).toThrow(/insuficientes/)
    expect(() => calculateRate([{ concentration: -1, order: 1 }], 2)).toThrow()
    expect(() => calculateRate([{ concentration: 1, order: 1 }], Infinity)).toThrow()
  })
})

describe('ordens experimentais e ajuste', () => {
  it.each([
    { orders: [1, 2], concentrations: [[1, 1], [2, 1], [1, 2], [2, 3]] },
    { orders: [1, -0.5, 0.75], concentrations: [[1, 1, 1], [2, 1, 1], [1, 3, 1], [1, 1, 5], [2, 3, 5]] },
  ])('identifica as ordens $orders', ({ orders, concentrations }) => {
    const k = 3.21
    const fit = fitRateLaw(concentrations.map((row) => ({
      concentrations: row, rate: row.reduce((product, x, i) => product * x ** orders[i], k),
    })), orders.length)
    fit.orders.forEach((value, i) => expect(value).toBeCloseTo(orders[i], 12))
    expect(fit.k).toBeCloseTo(k, 12)
    expect(fit.rSquared).toBeCloseTo(1, 12)
  })
  it('ajusta medidas ruidosas e fornece resíduos e graus de liberdade', () => {
    const fit = fitRateLaw([1, 2, 3, 4, 5].map((x, i) => ({ concentrations: [x], rate: 2 * x ** 1.5 * (i % 2 ? 0.98 : 1.02) })), 1)
    expect(fit.orders[0]).toBeCloseTo(1.5, 1)
    expect(fit.rSquared).toBeGreaterThan(0.99)
    expect(fit.residualDegrees).toBe(3)
    expect(fit.residuals.some((residual) => Math.abs(residual) > 0.01)).toBe(true)
  })
  it('rejeita ensaios escassos, preditores dependentes e velocidades inválidas', () => {
    expect(() => fitRateLaw([{ concentrations: [1, 2], rate: 3 }], 2)).toThrow(/insuficientes/)
    expect(() => fitRateLaw([1, 2, 3].map((x) => ({ concentrations: [x, x * 2], rate: x })), 2)).toThrow(/dependentes/)
    expect(() => fitRateLaw([{ concentrations: [1], rate: 0 }, { concentrations: [2], rate: 1 }], 1)).toThrow()
  })
})

describe('mecanismos e resolvedor', () => {
  const options = { relativeTolerance: 1e-8, absoluteTolerance: 1e-11, samples: 41 }
  it('compara A → B → C com as soluções analíticas e conserva a soma', () => {
    const species = [{ name: 'A', initial: 1 }, { name: 'B', initial: 0 }, { name: 'C', initial: 0 }]
    const steps = [{ reactants: 'A', products: 'B', forward: 1.2 }, { reactants: 'B', products: 'C', forward: 0.35 }]
    const run = simulateMechanism(species, steps, 12, options)
    for (const { time, values } of run.points) {
      const a = Math.exp(-1.2 * time)
      const b = 1.2 / (0.35 - 1.2) * (a - Math.exp(-0.35 * time))
      expect(values[0]).toBeCloseTo(a, 8)
      expect(values[1]).toBeCloseTo(b, 8)
      expect(values[2]).toBeCloseTo(1 - a - b, 8)
      expect(values.reduce((sum, value) => sum + value)).toBeCloseTo(1, 12)
    }
    expect(run.rejected).toBeGreaterThan(0)
  })
  it('compara o mecanismo reversível com a solução analítica de relaxação', () => {
    const species = [{ name: 'A', initial: 1 }, { name: 'B', initial: 0 }]
    const run = simulateMechanism(species, [{ reactants: 'A', products: 'B', forward: 0.8, reverse: 0.2 }], 20, options)
    for (const { time, values } of run.points) {
      expect(values[0]).toBeCloseTo(0.2 + 0.8 * Math.exp(-time), 8)
      expect(values[1]).toBeCloseTo(0.8 * (1 - Math.exp(-time)), 8)
    }
  })
  it('suporta coeficientes estequiométricos e nomes com carga', () => {
    expect(parseSide('2 H+ + A', ['H+', 'A', 'B'])).toEqual([2, 1, 0])
    const run = simulateMechanism([{ name: 'A', initial: 1 }, { name: 'B', initial: 0 }],
      [{ reactants: '2 A', products: 'B', forward: 0.5 }], 2, options)
    expect(run.points.at(-1)?.values[0]).toBeCloseTo(1 / 3, 8)
    expect(run.points.at(-1)?.values[1]).toBeCloseTo(1 / 3, 8)
    expect(() => parseSide('A + Z', ['A'])).toThrow(/inválido/)
  })
  it('rejeita etapas nulas, parâmetros negativos e amostragem inválida', () => {
    const species = [{ name: 'A', initial: 1 }]
    expect(() => simulateMechanism(species, [{ reactants: 'A', products: 'A', forward: 1 }], 2, options)).toThrow(/não altera/)
    expect(() => simulateMechanism(species, [{ reactants: 'A', products: '0', forward: -1 }], 2, options)).toThrow()
    expect(() => simulateMechanism(species, [{ reactants: 'A', products: '0', forward: 1 }], 2, { ...options, samples: 1 })).toThrow()
  })
})

describe('leis integradas', () => {
  it('avalia as três ordens e suas meias-vidas', () => {
    for (const order of [0, 1, 2] as const) {
      expect(concentrationAt(order, 2, 0.5, halfLife(order, 2, 0.5))).toBeCloseTo(1, 12)
    }
    expect(concentrationAt(0, 2, 0.5, 10)).toBe(0)
    expect(() => concentrationAt(1, 2, 0.5, -1)).toThrow()
  })
})

describe('entrada e intercâmbio de experimentos', () => {
  it('aceita vírgula, ponto e notação científica e rejeita entradas inválidas', () => {
    expect(numberFrom('1,2e-3', 'x')).toBe(0.0012)
    expect(numberFrom('1.2', 'x')).toBe(1.2)
    for (const value of ['', 'NaN', '1,2,3', '1e999', '0x11']) expect(() => numberFrom(value, 'x')).toThrow()
  })
  it('valida a estrutura e preserva os parâmetros na exportação e importação', async () => {
    const experiment = { module: 'rate', input: startingInputs.rate } as const
    expect(isExperiment({ module: 'experimental', input: { names: ['A'], rows: [['1']] } })).toBe(false)
    expect(isExperiment({ ...experiment, input: { ...experiment.input, k: Infinity } })).toBe(false)
    const file = new File([serializeExperiment(experiment)], 'rate.json')
    await expect(readExperiment(file)).resolves.toEqual(experiment)
    await expect(readExperiment(new File(['{"version":2}'], 'bad.json'))).rejects.toThrow(/incompatível/)
    expect(calculate(experiment).metrics[0].value).toBeCloseTo(0.00000625, 13)
  })
})
