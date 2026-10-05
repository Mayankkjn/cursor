import { IconSparkles, IconLayoutGrid } from '@tabler/icons-react'
import type { Answer, Question } from '../../views/builderData'

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <span className="max-w-[85%] rounded-[16px_16px_4px_16px] border border-secondary-200 bg-secondary-50 px-4 py-2.5 text-bodytext-03 text-secondary-1000">
        {text}
      </span>
    </div>
  )
}

export function AssistantLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <IconSparkles size={16} className="mt-0.5 flex-shrink-0 text-primary-400" />
      <p className="text-bodytext-03 text-secondary-1000">{text}</p>
    </div>
  )
}

export function SummaryList({ questions, answers }: { questions: Question[]; answers: Answer[] }) {
  return (
    <div className="rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3">
      <ol className="list-decimal space-y-1.5 pl-4 text-bodytext-03 text-secondary-1000">
        {questions.map((question, index) => (
          <li key={question.title}>
            {question.summaryLabel}: <strong className="font-semibold">{answers[index]?.label}</strong>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function BuildingRow({ ready }: { ready: boolean }) {
  return (
    <div className="flex items-center gap-2 text-bodytext-03 text-secondary-1000">
      {ready ? (
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#21AD73" strokeWidth={2.4}>
          <path d="M4 12.5 9.5 18 20 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <IconSparkles size={15} className="text-primary-400" />
      )}
      {ready ? 'Your dashboard is ready' : 'Building your dashboard...'}
    </div>
  )
}

export function SkeletonBars() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-2.5 w-full animate-pulse rounded-full bg-secondary-200" />
      <div className="h-2.5 w-[82%] animate-pulse rounded-full bg-secondary-200" style={{ animationDelay: '0.15s' }} />
      <div className="h-2.5 w-[60%] animate-pulse rounded-full bg-secondary-200" style={{ animationDelay: '0.3s' }} />
    </div>
  )
}

export function DashboardSummaryCard({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-400">
        <IconLayoutGrid size={18} stroke={1.8} />
      </span>
      <span className="flex min-w-0 flex-col">
        <strong className="truncate text-label-medium text-secondary-1000">{name}</strong>
        <span className="text-bodytext-04 text-secondary-500">Dashboard</span>
      </span>
    </div>
  )
}

export function DigFurtherChips({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-label-medium text-secondary-500">
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.7}>
          <path d="M6 3.5h9l3.5 3.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
          <path d="M8 10h8M8 13.5h8M8 17h5" strokeLinecap="round" />
        </svg>
        Want to dig further?
      </div>
      {['Summarise this dashboard', 'Breakdown by countries'].map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className="flex w-full items-center justify-between rounded-md border border-secondary-200 bg-white px-3.5 py-2.5 text-left text-bodytext-03 text-secondary-1000 transition-default hover:border-secondary-400 hover:bg-secondary-50"
        >
          {question}
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#7B7891" strokeWidth={2}>
            <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  )
}
