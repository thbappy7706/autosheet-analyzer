import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { paletteColor, correlationColor } from '../../lib/chartPalette'
import { formatDataNumber, truncateLabel } from '../../lib/format'
import { useFormatOptions } from '../../lib/settingsContext'
import type { CategoryCount, Correlation, CorrelationPair, HistogramBin, TimeBucket } from '../../types/analysis'

const axisStyle = { fontSize: 11 }

function tooltipStyle() {
  return {
    backgroundColor: 'rgba(0,0,0,0.75)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
  }
}

export function HistogramView({ bins }: { bins: HistogramBin[] }) {
  const { t } = useTranslation('charts')
  const { locale } = useFormatOptions()
  const data = bins.map((b) => ({
    bin: `${formatDataNumber(Number(b.from.toFixed(2)), locale)} – ${formatDataNumber(Number(b.to.toFixed(2)), locale)}`,
    from: b.from,
    count: b.count,
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey="bin" tick={axisStyle} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="count" name={t('frequency')} fill={paletteColor(0)} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CategoryBarView({ data, label }: { data: CategoryCount[]; label: string }) {
  const rows = data.map((d) => ({ name: truncateLabel(d.value, 16), full: d.value, count: d.count }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis type="number" tick={axisStyle} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={axisStyle} width={90} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="count" name={label} fill={paletteColor(1)} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TimeSeriesView({ data }: { data: TimeBucket[] }) {
  const { t } = useTranslation('charts')
  const rows = data.map((d) => ({ period: d.period, count: d.count }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey="period" tick={axisStyle} minTickGap={20} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Line type="monotone" dataKey="count" name={t('rows')} stroke={paletteColor(2)} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AreaView({ data }: { data: TimeBucket[] }) {
  const { t } = useTranslation('charts')
  const rows = data.map((d) => ({ period: d.period, count: d.count }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey="period" tick={axisStyle} minTickGap={20} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Area type="monotone" dataKey="count" name={t('rows')} stroke={paletteColor(3)} fill={paletteColor(3)} fillOpacity={0.25} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export interface ScatterPoint {
  x: number
  y: number
}

export function ScatterView({
  points,
  xName,
  yName,
}: {
  points: ScatterPoint[]
  xName: string
  yName: string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis type="number" dataKey="x" name={xName} tick={axisStyle} />
        <YAxis type="number" dataKey="y" name={yName} tick={axisStyle} />
        <Tooltip contentStyle={tooltipStyle()} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name={`${xName} · ${yName}`} data={points} fill={paletteColor(4)} fillOpacity={0.65} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export function DonutView({ data }: { data: CategoryCount[] }) {
  const rows = data.map((d) => ({ name: truncateLabel(d.value, 14), value: d.count }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={1}>
          {rows.map((_, i) => (
            <Cell key={i} fill={paletteColor(i)} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

export function BooleanDonutView({ tCount, fCount, tLabel, fLabel }: { tCount: number; fCount: number; tLabel: string; fLabel: string }) {
  return <DonutView data={[{ value: tLabel, count: tCount, pct: 0 }, { value: fLabel, count: fCount, pct: 0 }]} />
}

export function CorrelationHeatmap({ correlation }: { correlation: Correlation }) {
  const cols = correlation.columns
  if (cols.length < 2) return null
  return (
    <div className="overflow-auto h-full">
      <table className="table table-xs border-collapse">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c} className="text-[10px] font-normal align-bottom">
                <span className="inline-block max-w-[80px] truncate" title={c}>
                  {c}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((row, i) => (
            <tr key={row}>
              <th className="text-[10px] font-normal max-w-[110px] truncate" title={row}>
                {row}
              </th>
              {cols.map((col, j) => {
                const r = correlation.matrix[i]?.[j] ?? 0
                return (
                  <td
                    key={col}
                    className="text-center text-[10px] p-1"
                    style={{ backgroundColor: i === j ? 'transparent' : correlationColor(r) }}
                    title={`${row} · ${col}: r = ${r.toFixed(2)}`}
                  >
                    {i === j ? '' : r.toFixed(2)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CorrelationBars({ pairs, positive }: { pairs: CorrelationPair[]; positive: boolean }) {
  const rows = pairs.map((p) => ({
    name: `${truncateLabel(p.a, 12)} · ${truncateLabel(p.b, 12)}`,
    r: p.r,
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis type="number" domain={positive ? [0, 1] : [-1, 0]} tick={axisStyle} />
        <YAxis type="category" dataKey="name" tick={axisStyle} width={140} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="r" fill={positive ? paletteColor(0) : paletteColor(3)} />
      </BarChart>
    </ResponsiveContainer>
  )
}
