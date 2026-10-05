import { useState } from 'react'
import { IconChevronDown, IconCalendar, IconFilter, IconInfoCircle, IconDotsVertical, IconTrendingUp } from '@tabler/icons-react'
import { Card } from '../ui'
import { LineChart } from '../charts'
import type { DashboardData } from '../../views/builderData'

const RANGE_OPTIONS = [
  { id: 'default', label: 'Default', rangeLabel: 'Custom range' },
  { id: '7d', label: '7D', rangeLabel: 'Last 7 days' },
  { id: '30d', label: '30D', rangeLabel: 'Last 30 days' },
  { id: '90d', label: '90D', rangeLabel: 'Last 90 days' },
]

function WidgetHeader({ title }: { title: string }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <IconTrendingUp size={15} stroke={1.8} className="flex-shrink-0 text-secondary-500" />
      <h3 className="min-w-0 flex-1 truncate text-label-medium text-secondary-1000">{title}</h3>
      <div className="flex flex-shrink-0 items-center gap-0.5 text-secondary-500">
        <button type="button" aria-label="Info" className="grid h-6 w-6 place-items-center rounded-sm transition-default hover:bg-secondary-50 hover:text-secondary-1000">
          <IconInfoCircle size={13} />
        </button>
        <button type="button" aria-label="More options" className="grid h-6 w-6 place-items-center rounded-sm transition-default hover:bg-secondary-50 hover:text-secondary-1000">
          <IconDotsVertical size={13} />
        </button>
      </div>
    </div>
  )
}

function StatCard({ title, legendColor, legendLabel, value }: DashboardData['statCards'][number]) {
  return (
    <Card>
      <WidgetHeader title={title} />
      <p className="mb-2.5 text-bodytext-04 text-secondary-500">Last 30 days &bull; Measured weekly</p>
      <div className="mb-2.5 flex items-center justify-center gap-1.5 text-bodytext-04 text-secondary-500">
        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: legendColor }} />
        {legendLabel}
      </div>
      <div className="text-center text-heading-04 text-secondary-1000">{value}</div>
      <div className="text-center text-bodytext-04 text-secondary-500">Total events</div>
    </Card>
  )
}

function ChartCard({ title, stats, series, xLabels }: DashboardData['chartCards'][number] & { xLabels: string[] }) {
  return (
    <Card>
      <WidgetHeader title={title} />
      <p className="mb-2.5 text-bodytext-04 text-secondary-500">Last 30 days &bull; Measured weekly</p>

      <div className="mb-2 flex flex-wrap items-end gap-7">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col">
            <span className="text-heading-04 text-secondary-1000">{stat.value}</span>
            <span className={`text-bodytext-04 font-bold ${stat.trend === 'up' ? 'text-success-500' : 'text-critical-400'}`}>
              {stat.trend === 'up' ? '↗' : '↘'} {stat.change}%
            </span>
            <span className="text-bodytext-04 text-secondary-500">{stat.label}</span>
          </div>
        ))}
      </div>

      <LineChart
        data={{ xAxis: xLabels, series: series.map((s) => ({ name: s.name, data: s.data })) }}
        height={150}
        smooth
      />
    </Card>
  )
}

export function GeneratedDashboard({ data }: { data: DashboardData }) {
  const [activeRange, setActiveRange] = useState('30d')
  const rangeLabel = RANGE_OPTIONS.find((r) => r.id === activeRange)?.rangeLabel ?? 'Last 30 days'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-sm border border-secondary-200 bg-white px-3 py-2 text-label-medium text-secondary-1000 transition-default hover:bg-secondary-50"
        >
          Daily
          <IconChevronDown size={13} />
        </button>

        <div className="flex overflow-hidden rounded-sm border border-secondary-200 bg-white">
          {RANGE_OPTIONS.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveRange(option.id)}
              className={`px-3.5 py-2 text-label-medium transition-default ${
                index !== RANGE_OPTIONS.length - 1 ? 'border-r border-secondary-200' : ''
              } ${activeRange === option.id ? 'bg-secondary-50 text-secondary-1000' : 'text-secondary-500 hover:bg-secondary-50'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-sm border border-secondary-200 bg-white px-3 py-2 text-label-medium text-secondary-1000 transition-default hover:bg-secondary-50"
        >
          <IconCalendar size={14} />
          {rangeLabel}
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-sm border border-secondary-200 bg-white px-3 py-2 text-label-medium text-secondary-1000 transition-default hover:bg-secondary-50"
        >
          <IconFilter size={14} />
          Filter
        </button>
      </div>

      <div>
        <h3 className="mb-1 text-subheading-04 text-secondary-1000">{data.sectionTitle}</h3>
        <p className="max-w-[70ch] text-bodytext-03 text-secondary-500">{data.sectionSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.chartCards.map((card) => (
          <ChartCard key={card.title} {...card} xLabels={data.xLabels} />
        ))}
      </div>
    </div>
  )
}
