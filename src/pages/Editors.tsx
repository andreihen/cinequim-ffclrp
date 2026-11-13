import { Add, Field, Input, Remove, Segmented, nextName, removeAt, replaceAt } from '../components/Fields'
import { rateConstantUnit } from '../chemistry/rateLaws'
import type { Experiment, Inputs } from '../utils/experiments'

type Edit<T> = { input: T; change: (input: T) => void }

function RateEditor({ input, change }: Edit<Inputs['rate']>) {
  const { reagents } = input
  function update(index: number, key: keyof Inputs['rate']['reagents'][number], value: string) {
    change({ ...input, reagents: replaceAt(reagents, index, { ...reagents[index], [key]: value }) })
  }
  return <>
    <Segmented label="Objetivo do cálculo" value={input.mode} choices={[['rate', 'Calcular velocidade'], ['k', 'Determinar k']]} onChange={(mode) => change({ ...input, mode })} />
    <Field label={input.mode === 'rate' ? 'Constante de velocidade (k)' : 'Velocidade observada (mol L⁻¹ s⁻¹)'}
      hint={input.mode === 'rate' ? 'A unidade de k depende da ordem global da reação.' : undefined}>
      {input.mode === 'rate'
        ? <Input numeric value={input.k} onChange={(k) => change({ ...input, k })} />
        : <Input numeric value={input.rate} onChange={(rate) => change({ ...input, rate })} />}
    </Field>
    <div className="editor-group">
      <h3>Reagentes</h3>
      <div className="reactant-grid reactant-labels" aria-hidden="true"><span>Espécie</span><span>Concentração (mol/L)</span><span>Ordem</span><span /></div>
      {reagents.map((row, index) => <div className="reactant-grid" key={index}>
        <Input label={'Espécie ' + (index + 1)} value={row.name} onChange={(value) => update(index, 'name', value)} />
        <Input numeric label={'Concentração do reagente ' + (index + 1)} value={row.concentration} onChange={(value) => update(index, 'concentration', value)} />
        <Input numeric label={'Ordem do reagente ' + (index + 1)} value={row.order} onChange={(value) => update(index, 'order', value)} />
        <Remove label={'Remover reagente ' + (index + 1)} disabled={reagents.length === 1} onClick={() => change({ ...input, reagents: removeAt(reagents, index) })} />
      </div>)}
      <Add disabled={reagents.length >= 12} onClick={() => change({ ...input, reagents: [...reagents, { name: nextName(reagents.map((row) => row.name)), concentration: '', order: '1' }] })}>Adicionar reagente</Add>
    </div>
  </>
}

function Matrix({ rows, labels, change }: { rows: string[][]; labels: string[]; change: (rows: string[][]) => void }) {
  return <div className="editor-group">
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabela de ensaios">
      <table className="input-table">
        <thead><tr><th scope="col">Ensaio</th>{labels.map((label, i) => <th scope="col" key={i}>{label}</th>)}<th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>
          <th scope="row">{i + 1}</th>
          {row.map((value, j) => <td key={j}><Input numeric label={'Ensaio ' + (i + 1) + ', ' + labels[j]} value={value}
            onChange={(next) => change(replaceAt(rows, i, replaceAt(row, j, next)))} /></td>)}
          <td><Remove label={'Remover ensaio ' + (i + 1)} disabled={rows.length === 1} onClick={() => change(removeAt(rows, i))} /></td>
        </tr>)}</tbody>
      </table>
    </div>
    <Add disabled={rows.length >= 100} onClick={() => change([...rows, labels.map(() => '')])}>Adicionar ensaio</Add>
  </div>
}

function ExperimentalEditor({ input, change }: Edit<Inputs['experimental']>) {
  const { names, rows } = input
  return <>
    <p className="editor-note">Use velocidades iniciais positivas e varie as concentrações de forma independente. São necessários pelo menos {names.length + 1} ensaios para {names.length} {names.length === 1 ? 'reagente' : 'reagentes'}.</p>
    <div className="editor-group">
      <h3>Reagentes</h3>
      <div className="species-names">{names.map((name, i) => <div key={i}>
        <Input label={'Nome do reagente ' + (i + 1)} value={name} onChange={(value) => change({ ...input, names: replaceAt(names, i, value) })} />
        <Remove label={'Remover reagente ' + (i + 1)} disabled={names.length === 1}
          onClick={() => change({ names: removeAt(names, i), rows: rows.map((row) => removeAt(row, i)) })} />
      </div>)}</div>
      <Add disabled={names.length >= 8} onClick={() => change({ names: [...names, nextName(names)], rows: rows.map((row) => [...row.slice(0, -1), '', row[row.length - 1]]) })}>Adicionar reagente</Add>
    </div>
    <Matrix rows={rows} labels={[...names.map((name, i) => '[' + (name || 'R' + (i + 1)) + '] (mol/L)'), 'v₀ (mol/L/s)']}
      change={(next) => change({ ...input, rows: next })} />
  </>
}

function MechanismEditor({ input, change }: Edit<Inputs['mechanism']>) {
  const { species, steps } = input
  function setStep(i: number, patch: Partial<Inputs['mechanism']['steps'][number]>) {
    change({ ...input, steps: replaceAt(steps, i, { ...steps[i], ...patch }) })
  }
  return <>
    <div className="editor-group">
      <h3>Espécies e concentrações iniciais</h3>
      <div className="reactant-grid two-fields reactant-labels" aria-hidden="true"><span>Espécie</span><span>Concentração (mol/L)</span><span /></div>
      {species.map((row, i) => <div className="reactant-grid two-fields" key={i}>
        <Input label={'Espécie ' + (i + 1)} value={row.name} onChange={(name) => change({ ...input, species: replaceAt(species, i, { ...row, name }) })} />
        <Input numeric label={'Concentração inicial da espécie ' + (i + 1)} value={row.initial} onChange={(initial) => change({ ...input, species: replaceAt(species, i, { ...row, initial }) })} />
        <Remove label={'Remover espécie ' + (i + 1)} disabled={species.length === 1} onClick={() => change({ ...input, species: removeAt(species, i) })} />
      </div>)}
      <Add disabled={species.length >= 12} onClick={() => change({ ...input, species: [...species, { name: nextName(species.map((row) => row.name)), initial: '0' }] })}>Adicionar espécie</Add>
    </div>
    <div className="editor-group">
      <h3>Etapas elementares</h3>
      <p className="editor-note">Use o formato “2 A + B”. Use “0” para uma fonte ou sumidouro. Informe k direto e, quando aplicável, k inverso.</p>
      {steps.map((row, i) => <fieldset className="step-editor" key={i}>
        <legend>Etapa {i + 1}</legend>
        <div className="step-controls">
          <label className="check"><input type="checkbox" checked={row.reversible} onChange={(event) => setStep(i, { reversible: event.target.checked })} /> Reversível</label>
          <Remove label={'Remover etapa ' + (i + 1)} disabled={steps.length === 1} onClick={() => change({ ...input, steps: removeAt(steps, i) })} />
        </div>
        <div className="field-grid">
          <Field label="Reagentes"><Input label={'Reagentes da etapa ' + (i + 1)} value={row.reactants} onChange={(reactants) => setStep(i, { reactants })} placeholder="2 A + B" /></Field>
          <Field label="Produtos"><Input label={'Produtos da etapa ' + (i + 1)} value={row.products} onChange={(products) => setStep(i, { products })} placeholder="C" /></Field>
          <Field label="k direto"><Input numeric label={'k direto da etapa ' + (i + 1)} value={row.forward} onChange={(forward) => setStep(i, { forward })} /></Field>
          {row.reversible && <Field label="k inverso"><Input numeric label={'k inverso da etapa ' + (i + 1)} value={row.reverse} onChange={(reverse) => setStep(i, { reverse })} /></Field>}
        </div>
      </fieldset>)}
      <Add disabled={steps.length >= 24} onClick={() => change({ ...input, steps: [...steps, { reactants: '', products: '', forward: '', reverse: '', reversible: false }] })}>Adicionar etapa</Add>
    </div>
    <Field label="Duração (s)"><Input numeric value={input.duration} onChange={(duration) => change({ ...input, duration })} /></Field>
    <details className="advanced">
      <summary>Precisão e amostragem</summary>
      <div className="field-grid">
        <Field label="Tolerância relativa" hint="De 1e-12 a 0,01."><Input numeric value={input.relativeTolerance} onChange={(relativeTolerance) => change({ ...input, relativeTolerance })} /></Field>
        <Field label="Tolerância absoluta (mol/L)" hint="De 1e-15 a 0,01."><Input numeric value={input.absoluteTolerance} onChange={(absoluteTolerance) => change({ ...input, absoluteTolerance })} /></Field>
        <Field label="Pontos do gráfico" hint="De 2 a 1001."><Input numeric value={input.samples} onChange={(samples) => change({ ...input, samples })} /></Field>
      </div>
    </details>
  </>
}

function IntegratedEditor({ input, change }: Edit<Inputs['integrated']>) {
  return <>
    <Segmented label="Ordem da reação" value={input.order} choices={[['0', 'Ordem zero'], ['1', '1ª ordem'], ['2', '2ª ordem']]} onChange={(order) => change({ ...input, order })} />
    <Field label="Concentração inicial de A (mol/L)"><Input numeric value={input.initial} onChange={(initial) => change({ ...input, initial })} /></Field>
    <Field label={'Constante k (' + rateConstantUnit(Number(input.order)) + ')'}><Input numeric value={input.k} onChange={(k) => change({ ...input, k })} /></Field>
    <Field label="Tempo (s)"><Input numeric value={input.time} onChange={(time) => change({ ...input, time })} /></Field>
  </>
}

export function Editor({ experiment, change }: { experiment: Experiment; change: (value: Experiment) => void }) {
  switch (experiment.module) {
    case 'rate': return <RateEditor input={experiment.input} change={(input) => change({ module: 'rate', input })} />
    case 'experimental': return <ExperimentalEditor input={experiment.input} change={(input) => change({ module: 'experimental', input })} />
    case 'mechanism': return <MechanismEditor input={experiment.input} change={(input) => change({ module: 'mechanism', input })} />
    case 'integrated': return <IntegratedEditor input={experiment.input} change={(input) => change({ module: 'integrated', input })} />
  }
}
