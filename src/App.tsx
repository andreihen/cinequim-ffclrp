import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Activity, ArrowRight, BookOpen, Calculator, ChevronRight, Clock3, Download, FlaskConical,
  FolderOpen, GitBranch, Menu, Moon, RotateCcw, Save, Sun, Table2, Upload, X,
} from 'lucide-react'
import { Remove } from './components/Fields'
import { Results } from './components/Results'
import { examples } from './examples/library'
import { useRecords } from './hooks/useRecords'
import { Editor } from './pages/Editors'
import { csv, download, moduleNames, readExperiment, serializeExperiment, startingInputs, type Experiment, type ModuleId, type RecordEntry } from './utils/experiments'
import { calculate, type Result } from './utils/results'

const modules = {
  rate: { icon: Calculator, action: 'Calcular', description: 'Calcule a velocidade de uma reação ou determine a constante cinética a partir das concentrações e ordens dos reagentes.', formula: 'v = k\\, [A]^m\\,[B]^n' },
  experimental: { icon: Table2, action: 'Ajustar lei de velocidade', description: 'Determine as ordens de reação e a constante k a partir de medidas de velocidade inicial.', formula: '\\ln v = \\ln k + \\sum_i n_i\\ln[C_i]' },
  mechanism: { icon: GitBranch, action: 'Simular mecanismo', description: 'Combine etapas elementares e acompanhe como as concentrações evoluem ao longo do tempo.', formula: '\\frac{d[C_i]}{dt} = \\sum_j \\nu_{ij}\\left(v_j^+ - v_j^-\\right)' },
  integrated: { icon: Activity, action: 'Calcular concentração', description: 'Obtenha a concentração e a meia-vida para reações de ordem zero, primeira e segunda.', formula: '-\\frac{d[A]}{dt} = k[A]^n' },
}

const library = {
  examples: { icon: BookOpen, title: 'Biblioteca de exemplos' },
  history: { icon: Clock3, title: 'Histórico de cálculos' },
  saved: { icon: FolderOpen, title: 'Experimentos salvos' },
}

type Page = ModuleId | keyof typeof library
const moduleIds = Object.keys(modules) as ModuleId[]
const libraryIds = Object.keys(library) as (keyof typeof library)[]
const isModule = (page: Page): page is ModuleId => moduleIds.includes(page as ModuleId)
const pageName = (page: Page) => isModule(page) ? moduleNames[page] : library[page].title

function currentPage(): Page {
  const page = window.location.hash.slice(1) as Page
  return isModule(page) || libraryIds.includes(page as keyof typeof library) ? page : 'rate'
}

function defaultTheme() {
  try { return localStorage.getItem('cinelab.theme') === 'light' ? 'light' : 'dark' }
  catch { return 'dark' }
}

function asExperiment<K extends ModuleId>(module: K, inputs: typeof startingInputs): Experiment {
  return { module, input: inputs[module] } as Experiment
}

function App() {
  const [page, setPage] = useState(currentPage)
  const [theme, setTheme] = useState(defaultTheme)
  const [menu, setMenu] = useState(false)
  const [inputs, setInputs] = useState(startingInputs)
  const [output, setOutput] = useState<{ experiment: Experiment; result: Result; version: number } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const history = useRecords('cinelab.history.v1')
  const saved = useRecords('cinelab.saved.v1')
  const fileInput = useRef<HTMLInputElement>(null)
  const resultArea = useRef<HTMLDivElement>(null)
  const experiment = isModule(page) ? asExperiment(page, inputs) : null
  const result = experiment && output && experiment.module === output.experiment.module &&
    experiment.input === output.experiment.input ? output.result : null

  useEffect(() => {
    const read = () => { setPage(currentPage()); setMenu(false); setError('') }
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1017' : '#f2f5f5')
    try { localStorage.setItem('cinelab.theme', theme) } catch { /* Theme still applies for this session. */ }
  }, [theme])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!menu) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menu])

  function navigate(next: Page) {
    setPage(next)
    setMenu(false)
    setError('')
    if (window.location.hash !== '#' + next) window.location.hash = next
    window.scrollTo(0, 0)
  }

  function change(next: Experiment) {
    setInputs((previous) => ({ ...previous, [next.module]: next.input }))
    setOutput(null)
    setError('')
  }

  function load(next: Experiment) {
    change(next)
    navigate(next.module)
  }

  function entry(next: Experiment): RecordEntry {
    const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(16).padStart(8, '0')).join('')
    return { ...next, id, label: moduleNames[next.module], date: new Date().toISOString() }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!experiment) return
    let calculated: Result
    try {
      calculated = calculate(experiment)
    } catch (problem) {
      setOutput(null)
      setError(problem instanceof Error ? problem.message : 'Não foi possível concluir o cálculo.')
      return
    }
    setOutput({ experiment, result: calculated, version: Date.now() })
    setError('')
    try { history.update([entry(experiment), ...history.entries]) }
    catch { setNotice({ text: 'Cálculo concluído. O navegador não conseguiu gravar o histórico.', error: true }) }
    if (window.matchMedia('(max-width: 880px)').matches) {
      window.requestAnimationFrame(() => resultArea.current?.scrollIntoView({ block: 'start' }))
    }
  }

  function save() {
    if (!experiment) return
    try {
      saved.update([entry(experiment), ...saved.entries])
      setNotice({ text: 'Experimento salvo neste navegador.' })
    } catch { setNotice({ text: 'O navegador não conseguiu salvar o experimento.', error: true }) }
  }

  async function importFile(file: File) {
    try {
      const next = await readExperiment(file)
      load(next)
      setNotice({ text: 'Experimento importado.' })
    } catch (problem) {
      setNotice({ text: problem instanceof Error ? problem.message : 'Falha ao importar o arquivo.', error: true })
    }
  }

  function exportJson(next: Experiment) {
    download(serializeExperiment({ module: next.module, input: next.input } as Experiment), 'cinequim-ffclrp-' + next.module + '.json', 'application/json')
  }

  const openFile = () => fileInput.current?.click()
  const title = pageName(page)

  return <div className="shell">
    <a className="skip-link" href="#workspace" onClick={(event) => { event.preventDefault(); document.getElementById('workspace')?.focus() }}>Ir ao conteúdo</a>
    <input ref={fileInput} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="Arquivo de experimento"
      onChange={(event) => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (file) void importFile(file)
      }} />
    {menu && <button type="button" className="nav-overlay" onClick={() => setMenu(false)} aria-label="Fechar menu" />}
    <aside className={'sidebar ' + (menu ? 'sidebar-open' : '')} id="sidebar">
      <a className="brand" href="#rate" onClick={(event) => { event.preventDefault(); navigate('rate') }}>
        <span className="brand-icon"><FlaskConical size={24} strokeWidth={2.15} /></span>
        <span><strong>Cine<span>QUIM</span><span className="brand-campus"> - FFCLRP</span></strong><small>Cinética química</small></span>
      </a>
      <nav aria-label="Módulos do CineQUIM - FFCLRP">
        <div className="nav-group"><p>LABORATÓRIO</p>
          {moduleIds.map((id) => {
            const Icon = modules[id].icon
            return <a key={id} href={'#' + id} aria-current={page === id ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate(id) }}><Icon size={18} /><span>{moduleNames[id]}</span>{page === id && <ChevronRight className="nav-arrow" size={15} />}</a>
          })}
        </div>
        <div className="nav-group"><p>ESPAÇO DE TRABALHO</p>
          {libraryIds.map((id) => {
            const { icon: Icon, title: label } = library[id]
            return <a key={id} href={'#' + id} aria-current={page === id ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate(id) }}><Icon size={18} /><span>{label}</span>{page === id && <ChevronRight className="nav-arrow" size={15} />}</a>
          })}
        </div>
      </nav>
      <div className="sidebar-footer"><span><i /> Cálculos no navegador</span><small>Armazenamento local</small></div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb">
          <button className="icon-button mobile-menu" type="button" aria-label={menu ? 'Fechar navegação' : 'Abrir navegação'} aria-expanded={menu}
            aria-controls="sidebar" onClick={() => setMenu(!menu)}>{menu ? <X size={22} /> : <Menu size={22} />}</button>
          <span className="crumb-home">{experiment ? 'Laboratório' : 'Espaço de trabalho'}</span><ChevronRight size={15} className="crumb-home" />
          <span className="crumb-title">{title}</span>
        </div>
        <div className="header-actions">
          <button type="button" className="button secondary import-button" aria-label="Importar experimento" title="Importar experimento" onClick={openFile}><Upload size={16} /><span>Importar</span></button>
          {experiment && <button type="button" className="button secondary save-button" aria-label="Salvar experimento" title="Salvar experimento" onClick={save}><Save size={16} /><span>Salvar</span></button>}
          <span className="topbar-divider" />
          <button type="button" className="icon-button theme-button" aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>
      <main id="workspace" tabIndex={-1} className="workspace">
        {experiment ? <>
          <section className={'hero ' + (page === 'rate' ? 'hero-illustrated' : '')}>
            {page === 'rate' && <img className="hero-image" src={import.meta.env.BASE_URL + 'molecula.jpg'} alt="" />}
            <div className="hero-content">
              <p className="hero-kicker"><FlaskConical size={14} /> Laboratório Interativo de Cinética Química</p>
              <h1>{title}</h1>
              {page === 'rate' && <div className="academic-header" role="group" aria-label="Identificação acadêmica">
                <p className="academic-student"><strong>Adriane Camille Oliveira Silva</strong><span className="academic-id">16831320</span></p>
                <dl>
                  <div><dt>Matéria</dt><dd>Cinética Química</dd></div>
                  <div><dt>Docente</dt><dd>Prof. Dr. Fritz Cavalcante Huguenin</dd></div>
                </dl>
              </div>}
              <p className="hero-description">{modules[experiment.module].description}</p>
            </div>
          </section>
          <div className={'workbench ' + (page === 'mechanism' || page === 'experimental' ? 'workbench-wide' : '')}>
            <section className="panel input-panel" aria-labelledby="input-title">
              <div className="panel-header">
                <span className="panel-icon"><FlaskConical size={19} /></span>
                <div><h2 id="input-title">Parâmetros da reação</h2><p>Configure os dados do seu experimento.</p></div>
              </div>
              <form onSubmit={submit} className="editor">
                <Editor experiment={experiment} change={change} />
                {error && <div role="alert" className="error-message">{error}</div>}
                <div className="form-actions">
                  <button className="button primary" type="submit"><Calculator size={17} />{modules[experiment.module].action}<ArrowRight className="action-arrow" size={17} /></button>
                  <button className="button secondary reset-button" type="button" onClick={() => change(asExperiment(experiment.module, startingInputs))}><RotateCcw size={16} /> Restaurar</button>
                </div>
              </form>
            </section>
            <div ref={resultArea} className="results-anchor">
              <Results result={result} equation={modules[experiment.module].formula} version={output?.version ?? 0}
                exportCsv={() => { if (result) download(csv(result.csv), 'cinequim-ffclrp-' + experiment.module + '.csv', 'text/csv;charset=utf-8') }} />
            </div>
          </div>
          <div className="workspace-footer">
            <button className="button text-button" type="button" onClick={() => navigate('examples')}><BookOpen size={16} /> Ver exemplos <ChevronRight size={15} /></button>
            <button className="button text-button" type="button" onClick={() => exportJson(experiment)}><Download size={16} /> Exportar JSON</button>
          </div>
        </> : <>
          <section className="hero"><div className="hero-content">
            <h1>{title}</h1>
            <p className="hero-description">{page === 'examples' ? 'Carregue um cenário para demonstrar os cálculos do CineQUIM - FFCLRP.' : 'Abra um experimento armazenado neste navegador.'}</p>
          </div></section>
          {page === 'examples' ? <div className="example-grid">{examples.map(({ title: label, description, experiment: example }) => {
            const Icon = modules[example.module].icon
            return <article className="panel example-card" key={label}>
              <span className="panel-icon"><Icon size={20} /></span><small>{moduleNames[example.module]}</small>
              <h2>{label}</h2><p>{description}</p>
              <button className="button secondary" onClick={() => load(example)}>Carregar exemplo <ArrowRight size={16} /></button>
            </article>
          })}</div> : <div className="record-list">
            {(page === 'saved' ? saved : history).entries.length === 0 && <div className="panel empty-record"><FolderOpen size={28} />
              <h2>{page === 'saved' ? 'Nenhum experimento salvo' : 'Nenhum cálculo no histórico'}</h2>
              <button type="button" className="button secondary" onClick={() => navigate('rate')}>Abrir calculadora <ArrowRight size={16} /></button>
            </div>}
            {(page === 'saved' ? saved : history).entries.map((item) => <article className="panel record" key={item.id}>
              <div><h2>{item.label}</h2><time dateTime={item.date}>{new Date(item.date).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
              <div className="record-actions">
                <button className="button secondary" type="button" onClick={() => load(item)}>Abrir</button>
                <button className="icon-button" type="button" title="Exportar JSON" aria-label="Exportar JSON" onClick={() => exportJson(item)}><Download size={17} /></button>
                <Remove label="Remover registro" onClick={() => {
                  const records = page === 'saved' ? saved : history
                  try { records.update(records.entries.filter(({ id }) => id !== item.id)) }
                  catch { setNotice({ text: 'O navegador não conseguiu remover o registro.', error: true }) }
                }} />
              </div>
            </article>)}
          </div>}
        </>}
      </main>
    </div>
    {notice && <div role={notice.error ? 'alert' : 'status'} className={'toast ' + (notice.error ? 'toast-error' : '')}>
      <span>{notice.text}</span><button className="icon-button" type="button" aria-label="Dispensar mensagem" onClick={() => setNotice(null)}><X size={17} /></button>
    </div>}
  </div>
}

export default App
