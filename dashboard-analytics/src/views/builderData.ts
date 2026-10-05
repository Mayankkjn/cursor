export interface QuestionOption {
  key: string
  label: string
  freeText?: boolean
}

export interface Question {
  title: string
  summaryLabel: string
  options: QuestionOption[]
}

export interface Answer {
  key: string
  label: string
}

export const QUESTIONS: Question[] = [
  {
    title: 'What is your goal?',
    summaryLabel: 'Selected goal',
    options: [
      { key: 'A', label: 'To track usage and find areas of improvement' },
      { key: 'B', label: 'To collect data for quarterly review' },
      { key: 'C', label: 'Mention any other goal...', freeText: true },
    ],
  },
  {
    title: 'Who is this dashboard for?',
    summaryLabel: 'Audience',
    options: [
      { key: 'A', label: 'Product & growth team' },
      { key: 'B', label: 'Leadership & executives' },
      { key: 'C', label: 'Mention who else this is for...', freeText: true },
    ],
  },
  {
    title: 'What time range should it cover?',
    summaryLabel: 'Date range',
    options: [
      { key: 'A', label: 'Last 30 days' },
      { key: 'B', label: 'Last quarter' },
      { key: 'C', label: 'Mention a custom range...', freeText: true },
    ],
  },
]

export const EXTRA_SUGGESTIONS = [
  'Compare usage across segments',
  'Understand where users drop off',
  'Track flow completion rates',
]

export const FOLLOWUP_REPLIES: Record<string, string> = {
  'Summarise this dashboard':
    'Adoption is trending up about 12% week over week, with a dip over weekends and steady completion rates across teams.',
  'Breakdown by countries':
    'Top usage comes from the US, India, and the UK, together accounting for over 60% of tracked events this period.',
}

export function deriveConversationTitle(promptText: string): string {
  const text = promptText.toLowerCase()
  if (text.includes('adopt') || text.includes('feature')) return 'Create new feature adoption trend'
  if (text.includes('usage') || text.includes('product')) return 'Create new product usage trend'
  if (text.includes('content') || text.includes('performance')) return 'Create new content performance trend'
  return 'Create new opportunity trend'
}

export function deriveDashboardName(promptText: string): string {
  const text = promptText.toLowerCase()
  if (text.includes('adopt') || text.includes('feature')) return 'Feature adoption dashboard'
  if (text.includes('usage') || text.includes('product')) return 'Product usage dashboard'
  if (text.includes('content') || text.includes('performance')) return 'Content performance dashboard'
  return 'New dashboard'
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function randomSeries(points: number, min: number, max: number): number[] {
  return Array.from({ length: points }, () => randomInt(min, max))
}

function randomChange(base: number, spread: number): string {
  return (Math.random() * spread + base).toFixed(2)
}

export interface StatCardData {
  title: string
  legendColor: string
  legendLabel: string
  value: number
}

export interface ChartStat {
  value: number
  trend: 'up' | 'down'
  change: string
  label: string
}

export interface ChartSeries {
  name: string
  color: string
  data: number[]
}

export interface ChartCardData {
  title: string
  stats: ChartStat[]
  series: ChartSeries[]
}

export interface DashboardData {
  sectionTitle: string
  sectionSubtitle: string
  xLabels: string[]
  statCards: StatCardData[]
  chartCards: ChartCardData[]
}

export function buildDashboardData(promptText: string): DashboardData {
  const text = promptText.toLowerCase()
  let noun: string
  if (text.includes('adopt') || text.includes('feature')) noun = 'feature'
  else if (text.includes('usage') || text.includes('product')) noun = 'session'
  else if (text.includes('content') || text.includes('performance')) noun = 'content view'
  else noun = 'action'
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)
  const xLabels = ['Day 1', 'Day 10', 'Day 20', 'Day 30']

  return {
    sectionTitle: `${Noun} start vs completion trend`,
    sectionSubtitle: `This section shows how ${noun}s have been initiated and completed by various user roles within your product`,
    xLabels,
    statCards: [
      { title: `Total ${noun}s started`, legendColor: '#0975D7', legendLabel: `${Noun}-Start`, value: randomInt(280, 420) },
      { title: `Total ${noun}s completed`, legendColor: '#F55800', legendLabel: `${Noun}-Finish`, value: randomInt(150, 280) },
      { title: `Total ${noun}s overdue`, legendColor: '#E0A400', legendLabel: `Overdue ${Noun}`, value: randomInt(40, 140) },
    ],
    chartCards: [
      {
        title: `${Noun} completion trend`,
        stats: [
          { value: randomInt(700, 1100), trend: 'up', change: randomChange(5, 15), label: 'Total events' },
          { value: randomInt(80, 150), trend: 'down', change: randomChange(1, 6), label: 'Monthly avg' },
        ],
        series: [{ name: `${Noun} initiated`, color: '#0975D7', data: randomSeries(10, 20, 95) }],
      },
      {
        title: `${Noun} trend - started vs completed`,
        stats: [
          { value: randomInt(400, 650), trend: 'up', change: randomChange(5, 15), label: 'Total events' },
          { value: randomInt(80, 150), trend: 'down', change: randomChange(1, 6), label: 'Monthly avg' },
        ],
        series: [
          { name: `${Noun}-Start`, color: '#0975D7', data: randomSeries(10, 20, 95) },
          { name: `${Noun}-Finish`, color: '#F55800', data: randomSeries(10, 15, 85) },
        ],
      },
      {
        title: `${Noun} completed by persona`,
        stats: [
          { value: randomInt(400, 650), trend: 'up', change: randomChange(5, 15), label: 'Total events' },
          { value: randomInt(80, 150), trend: 'down', change: randomChange(1, 6), label: 'Monthly avg' },
        ],
        series: [{ name: `${Noun} completed`, color: '#0975D7', data: randomSeries(10, 20, 95) }],
      },
    ],
  }
}
