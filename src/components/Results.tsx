import { lazy, Suspense } from 'react'
import { Activity, BookOpen, Calculator, ChevronDown, Download, Printer } from 'lucide-react'
import katex from 'katex'
import { format, type Result } from '../utils/results'

const ScientificChart = lazy(() => import('./ScientificChart'))

export function Formula({ value }: { value: string }) {
  return <div className="formula-content" tabIndex={0}
    dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { displayMode: true, throwOnError: false, trust: false }) }} />
}

export function Results({ result, equation, version, exportCsv }: {
  result: Result | null; equation: string; version: number; exportCsv: () => void
}) {
  return <div className="results-stack">
    <section className="panel results-panel" aria-labelledby="results-title">
      <div className="panel-header">
        <span className="panel-icon"><Activity size={20} /></span>
        <div><h2 id="results-title">Resultados</h2><p>Saída do cálculo e análise cinética.</p></div>
        <span className={'status ' + (result ? 'ready' : '')}><i />{result ? 'Concluído' : 'Aguardando'}</span>
      </div>
      {result ? <>
        <div className="metrics" aria-live="polite">
          {result.metrics.map(({ label, value, unit }) => <div className="metric" key={label}>
            <span>{label}</span><strong>{typeof value === 'number' ? format(value) : value}</strong>{unit && <small>{unit}</small>}
          </div>)}
        </div>
        {result.chart && <Suspense fallback={<p className="chart-loading">Carregando gráfico…</p>}><ScientificChart key={version} chart={result.chart} /></Suspense>}
        <div className="result-actions">
          <button type="button" className="button secondary" onClick={exportCsv}><Download size={16} /> Exportar CSV</button>
          <button type="button" className="button secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir relatório</button>
        </div>
      </> : <div className="empty-result">
        <span><Calculator size={27} strokeWidth={1.55} /></span>
        <strong>Nenhum cálculo realizado</strong>
        <p>Preencha os parâmetros e execute o cálculo para visualizar os resultados.</p>
      </div>}
    </section>
    <section className="panel theory-panel" aria-labelledby="theory-title">
      <div className="panel-header">
        <span className="panel-icon theory-icon"><BookOpen size={19} /></span>
        <div><h2 id="theory-title">Fundamentação matemática</h2><p>Equação e etapas do cálculo.</p></div>
      </div>
      <div className="formula-box"><Formula value={result?.equation ?? equation} /></div>
      {result && <details className="math-steps" open>
        <summary>Passo a passo <ChevronDown size={16} /></summary>
        <ol>{result.steps.map(({ title, text, formula }) => <li key={title}>
          <strong>{title}</strong>{text && <p>{text}</p>}{formula && <Formula value={formula} />}
        </li>)}</ol>
      </details>}
    </section>
    {result && <section className="panel print-parameters">
      <h2>Parâmetros e dados de entrada</h2>
      <table><tbody>{result.parameters.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{typeof cell === 'number' ? format(cell) : cell}</td>)}</tr>)}</tbody></table>
    </section>}
  </div>
}
