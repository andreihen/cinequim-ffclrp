import { fitRateLaw } from '../chemistry/experimentalData'
import { concentrationAt, halfLife, type IntegratedOrder } from '../chemistry/integratedLaws'
import { calculateRate, determineK, rateConstantUnit } from '../chemistry/rateLaws'
import { simulateMechanism } from '../chemistry/reactionMechanisms'
import { numberFrom as number, speciesNames } from '../chemistry/validations'
import { type Experiment } from './experiments'

type Cell = string | number
export interface ChartSpec {
  x: string
  y: string
  series: { name: string; kind?: 'points'; points: { x: number; y: number }[] }[]
}
export interface Result {
  metrics: { label: string; value: Cell; unit?: string }[]
  equation: string
  steps: { title: string; text?: string; formula?: string }[]
  parameters: Cell[][]
  csv: Cell[][]
  chart?: ChartSpec
}

export const format = (value: number) => {
  if (value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 1e6)) return value.toExponential(4).replace('.', ',')
  return new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 6, useGrouping: false }).format(value)
}
const tex = (value: number) => format(value).replace(',', '{,}').replace(/e\+?(-?\d+)$/, '\\times 10^{$1}')
const formulaName = (value: string) => '\\text{' + value.replaceAll('^', 'ˆ').replaceAll('_', '‗') + '}'
const steps = (max: number, count = 121) => Array.from({ length: count }, (_, i) => max * (i / (count - 1)))
const axis = (name: string, values: number[], xs: number[]) => ({
  name, points: values.map((y, i) => ({ x: xs[i], y })),
})

export function calculate(experiment: Experiment): Result {
  switch (experiment.module) {
    case 'rate': {
      const { mode, reagents, k: kInput, rate: rateInput } = experiment.input
      const names = speciesNames(reagents.map(({ name }) => name))
      const terms = reagents.map((row, i) => ({
        concentration: number(row.concentration, 'Concentração de ' + names[i], 0),
        order: number(row.order, 'Ordem de ' + names[i], -100, 100),
      }))
      const order = terms.reduce((sum, term) => sum + term.order, 0)
      if (mode === 'k' && !rateInput.trim()) throw new Error('Dados insuficientes para determinar k. Informe a velocidade observada.')
      const observed = mode === 'k' ? number(rateInput, 'Velocidade observada') : 0
      const k = mode === 'rate' ? number(kInput, 'Constante k') : determineK(terms, observed)
      const rate = mode === 'rate' ? calculateRate(terms, k) : observed
      const unit = rateConstantUnit(order)
      const law = terms.map((term, i) => '[' + formulaName(names[i]) + ']^{' + tex(term.order) + '}').join('\\,')
      const substitution = terms.map((term) => '\\left(' + tex(term.concentration) + '\\right)^{' + tex(term.order) + '}').join('\\cdot ')
      const metrics = [
        { label: mode === 'rate' ? 'Velocidade da reação' : 'Constante de velocidade', value: mode === 'rate' ? rate : k, unit: mode === 'rate' ? 'mol L⁻¹ s⁻¹' : unit },
        { label: 'Ordem global', value: order },
        { label: mode === 'rate' ? 'Constante k' : 'Velocidade observada', value: mode === 'rate' ? k : rate, unit: mode === 'rate' ? unit : 'mol L⁻¹ s⁻¹' },
      ]
      return {
        metrics, equation: 'v = k\\,' + law,
        steps: [
          { title: 'Some as ordens parciais', formula: 'n = ' + terms.map(({ order }) => '(' + tex(order) + ')').join(' + ') + ' = ' + tex(order) },
          { title: 'Substitua os valores na lei', formula: mode === 'rate'
            ? 'v = ' + tex(k) + '\\cdot ' + substitution + ' = ' + tex(rate)
            : 'k = \\frac{' + tex(rate) + '}{' + substitution + '} = ' + tex(k) },
          { title: 'Determine a unidade de k', formula: '[k] = \\mathrm{M}^{' + tex(1 - order) + '}\\,\\mathrm{s}^{-1}', text: 'M representa mol L⁻¹.' },
        ],
        parameters: [['Reagente', 'Concentração (mol/L)', 'Ordem'], ...terms.map((term, i) => [names[i], term.concentration, term.order])],
        csv: [['Velocidade (mol/L/s)', 'Ordem global', 'k', 'Unidade de k'], [rate, order, k, unit]],
      }
    }
    case 'experimental': {
      const names = speciesNames(experiment.input.names, 8)
      const rows = experiment.input.rows.map((row, i) => ({
        concentrations: names.map((name, j) => number(row[j], 'Ensaio ' + (i + 1) + ', concentração de ' + name)),
        rate: number(row[names.length], 'Velocidade do ensaio ' + (i + 1)),
      }))
      const fit = fitRateLaw(rows, names.length)
      const observed = rows.map(({ rate }) => rate)
      const lo = Math.min(...observed)
      const hi = Math.max(...observed)
      const diagnostics = fit.residualDegrees === 0 ? 'O ajuste tem zero graus de liberdade residuais. Inclua mais ensaios para avaliar os resíduos.' : 'O R² informado é calculado na escala logarítmica.'
      return {
        metrics: [
          { label: 'Constante de velocidade', value: fit.k, unit: fit.unit },
          { label: 'Ordem global', value: fit.totalOrder },
          { label: 'R² em log', value: fit.rSquared ?? 'Indefinido' },
          ...fit.orders.map((value, i) => ({ label: 'Ordem em ' + names[i], value })),
        ],
        equation: 'v = ' + tex(fit.k) + '\\,' + names.map((name, i) => '[' + formulaName(name) + ']^{' + tex(fit.orders[i]) + '}').join('\\,'),
        steps: [
          { title: 'Linearize a lei', formula: '\\ln v = \\ln k + \\sum_i n_i\\ln[C_i]' },
          { title: 'Ajuste as ordens por mínimos quadrados', text: 'Os coeficientes das concentrações em log são as ordens parciais. ' + diagnostics },
          { title: 'Recupere k pelo intercepto', formula: 'k = e^{' + tex(fit.intercept) + '} = ' + tex(fit.k) },
        ],
        parameters: [[...names.map((name) => '[' + name + '] (mol/L)'), 'Velocidade (mol/L/s)'], ...rows.map((row) => [...row.concentrations, row.rate])],
        csv: [['Ensaio', ...names.map((name) => '[' + name + '] (mol/L)'), 'v observada (mol/L/s)', 'v ajustada (mol/L/s)', 'Resíduo em log', ...names.map((name) => 'Ordem em ' + name), 'k', 'Unidade de k'], ...rows.map((row, i) => [i + 1, ...row.concentrations, row.rate, fit.fittedRates[i], fit.residuals[i], ...fit.orders, fit.k, fit.unit])],
        chart: { x: 'v observada (mol L⁻¹ s⁻¹)', y: 'v ajustada (mol L⁻¹ s⁻¹)', series: [
          axis('Igualdade', [lo, hi], [lo, hi]), { ...axis('Ensaios', fit.fittedRates, observed), kind: 'points' },
        ] },
      }
    }
    case 'mechanism': {
      const input = experiment.input
      const duration = number(input.duration, 'Duração')
      const options = {
        relativeTolerance: number(input.relativeTolerance, 'Tolerância relativa', 1e-12, 0.01),
        absoluteTolerance: number(input.absoluteTolerance, 'Tolerância absoluta', 1e-15, 0.01),
        samples: number(input.samples, 'Pontos do gráfico', 2, 1001),
      }
      const initial = input.species.map(({ name, initial }) => ({ name, initial: number(initial, 'Concentração de ' + name) }))
      const reactions = input.steps.map((step, i) => ({
        ...step, forward: number(step.forward, 'Constante direta da etapa ' + (i + 1)),
        reverse: step.reversible ? number(step.reverse, 'Constante inversa da etapa ' + (i + 1)) : undefined,
      }))
      const run = simulateMechanism(initial, reactions, duration, options)
      const final = run.points[run.points.length - 1]
      const sideOrder = (coefficients: number[]) => coefficients.reduce((sum, count) => sum + count, 0)
      return {
        metrics: run.names.map((name, i) => ({ label: '[' + name + '] final', value: final.values[i], unit: 'mol L⁻¹' })),
        equation: '\\frac{d[C_i]}{dt} = \\sum_j \\nu_{ij}\\left(v_j^+ - v_j^-\\right)',
        steps: [
          { title: 'Aplique a ação das massas', formula: 'v_j^+ = k_j^+\\prod_i [C_i]^{\\alpha_{ij}},\\qquad v_j^- = k_j^-\\prod_i [C_i]^{\\beta_{ij}}',
            text: 'As potências vêm dos coeficientes de cada etapa elementar. Em uma etapa irreversível, o fluxo inverso é zero.' },
          { title: 'Monte as equações diferenciais', formula: '\\nu_{ij} = \\beta_{ij} - \\alpha_{ij}' },
          { title: 'Integre com controle de erro', text: 'Dormand–Prince 5(4) aceitou ' + run.accepted + ' passos e rejeitou ' + run.rejected + '. As constantes foram fornecidas como parâmetros da simulação.' },
        ],
        parameters: [
          ['Espécie', 'Concentração inicial (mol/L)'], ...initial.map(({ name, initial: value }) => [name, value]),
          ['Etapa', 'Reação', 'k direto', 'Unidade', 'k inverso', 'Unidade'],
          ...reactions.map((step, i) => [i + 1, step.reactants + (step.reversible ? ' ⇌ ' : ' → ') + step.products, step.forward,
            rateConstantUnit(sideOrder(run.model[i].left)), step.reverse ?? '', step.reversible ? rateConstantUnit(sideOrder(run.model[i].right)) : '']),
          ['Duração (s)', duration], ['Tolerância relativa', options.relativeTolerance], ['Tolerância absoluta (mol/L)', options.absoluteTolerance], ['Pontos', options.samples],
        ],
        csv: [['Tempo (s)', ...run.names.map((name) => '[' + name + '] (mol/L)')], ...run.points.map((point) => [point.time, ...point.values])],
        chart: { x: 'Tempo (s)', y: 'Concentração (mol L⁻¹)', series: run.names.map((name, i) =>
          ({ name, points: run.points.map((point) => ({ x: point.time, y: point.values[i] })) })) },
      }
    }
    case 'integrated': {
      const input = experiment.input
      const order = Number(input.order) as IntegratedOrder
      const initial = number(input.initial, 'Concentração inicial')
      const k = number(input.k, 'Constante k')
      const time = number(input.time, 'Tempo', 0)
      const lifetime = halfLife(order, initial, k)
      const concentration = concentrationAt(order, initial, k, time)
      const times = time === 0 ? [0] : steps(time)
      const series = times.map((t) => concentrationAt(order, initial, k, t))
      const equation = [
        '[A]_t = \\max\\left(0, [A]_0 - kt\\right)',
        '[A]_t = [A]_0\\,e^{-kt}',
        '[A]_t = \\frac{1}{1/[A]_0 + kt}',
      ][order]
      return {
        metrics: [{ label: 'Concentração em t', value: concentration, unit: 'mol L⁻¹' }, { label: 'Meia-vida', value: lifetime, unit: 's' }],
        equation,
        steps: [
          { title: 'Integre a lei diferencial', formula: '-\\frac{d[A]}{dt} = k[A]^{' + order + '}', text: order === 0 ? 'A concentração é mantida em zero após o esgotamento do reagente.' : undefined },
          { title: 'Avalie a concentração no tempo informado', formula: '[A]_{t=' + tex(time) + '\\,\\mathrm{s}} = ' + tex(concentration) + '\\,\\mathrm{mol\\,L^{-1}}' },
          { title: 'Resolva para metade da concentração inicial', formula: 't_{1/2} = ' + ['\\frac{[A]_0}{2k}', '\\frac{\\ln 2}{k}', '\\frac{1}{k[A]_0}'][order] + ' = ' + tex(lifetime) + '\\,\\mathrm{s}' },
        ],
        parameters: [['Ordem', order], ['[A] inicial (mol/L)', initial], ['k (' + rateConstantUnit(order) + ')', k], ['Tempo (s)', time]],
        csv: [['Tempo (s)', '[A] (mol/L)', 'Meia-vida (s)'], ...times.map((t, i) => [t, series[i], lifetime])],
        chart: { x: 'Tempo (s)', y: 'Concentração (mol L⁻¹)', series: [axis('[A]', series, times)] },
      }
    }
  }
}
