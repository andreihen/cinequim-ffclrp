import { useState } from 'react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { format, type ChartSpec } from '../utils/results'

const colors = ['var(--accent)', '#7d8fff', '#e8a447', '#db74b0', '#45aaf2', '#b58df0', '#ea755d', '#8db449', '#e16982', '#52b8b6', '#9ca5d2', '#a48c68']

export default function ScientificChart({ chart }: { chart: ChartSpec }) {
  const [hidden, setHidden] = useState<string[]>([])
  const visible = chart.series.map((series, i) => ({ ...series, color: colors[i] })).filter(({ name }) => !hidden.includes(name))
  const xs = chart.series.flatMap(({ points }) => points.map(({ x }) => x))
  const ys = chart.series.flatMap(({ points }) => points.map(({ y }) => y))
  const domain = (values: number[]) => {
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = min === max ? Math.max(Math.abs(min) * 0.05, 1e-12) : 0
    return [min - pad, max + pad] as [number, number]
  }
  return <figure className="chart">
    <figcaption>{chart.y} × {chart.x}</figcaption>
    <div className="chart-plot">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart margin={{ top: 12, right: 22, bottom: 6, left: 2 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
          <XAxis type="number" dataKey="x" name={chart.x} domain={domain(xs)} allowDataOverflow tickFormatter={format} tickCount={5}
            tick={{ fontSize: 10, fill: 'var(--muted)' }} stroke="var(--line)" />
          <YAxis type="number" dataKey="y" name={chart.y} domain={domain(ys)} allowDataOverflow tickFormatter={format} tickCount={5}
            width={66} tick={{ fontSize: 10, fill: 'var(--muted)' }} stroke="var(--line)" />
          <Tooltip shared={false} contentStyle={{ background: 'var(--surface)', borderColor: 'var(--line)', borderRadius: 8 }}
            labelStyle={{ color: 'var(--muted)' }} itemStyle={{ color: 'var(--text)' }}
            formatter={(value) => typeof value === 'number' ? format(value) : String(value)}
            labelFormatter={(value) => typeof value === 'number' ? format(value) : String(value)} />
          {visible.map(({ name, points, color, kind }) => kind === 'points'
            ? <Scatter key={name} name={name} data={points} fill={color} isAnimationActive={false} />
            : <Line key={name} name={name} data={points} dataKey="y" stroke={color} strokeWidth={2}
              dot={points.length < 3 || points.every(({ x }) => x === points[0].x)} isAnimationActive={false} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <div className="chart-legend" aria-label="Séries do gráfico">
      {chart.series.map(({ name }, i) => <button key={name} type="button" aria-pressed={!hidden.includes(name)}
        onClick={() => setHidden(hidden.includes(name) ? hidden.filter((entry) => entry !== name) : [...hidden, name])}>
        <span style={{ background: colors[i] }} />{name}
      </button>)}
    </div>
  </figure>
}
