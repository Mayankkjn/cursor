import { useState, type FormEvent } from 'react'
import { IconArrowUp, IconArrowUpRight, IconDots, IconFolder, IconBulb, IconLetterA } from '@tabler/icons-react'
import { EXTRA_SUGGESTIONS } from '../../views/builderData'

const BASE_SUGGESTIONS = [
  'Track adoption of my key features',
  'Monitor overall product usage',
  'Track performance of my content',
]

interface BuilderEmptyStateProps {
  onSubmitPrompt: (text: string) => void
  onExistingInsight: () => void
  onNewInsight: () => void
  onAddText: () => void
}

export function BuilderEmptyState({ onSubmitPrompt, onExistingInsight, onNewInsight, onAddText }: BuilderEmptyStateProps) {
  const [value, setValue] = useState('')
  const [showMore, setShowMore] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmitPrompt(trimmed)
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center p-10 text-center">
      <div className="mb-7 w-[300px] rounded-lg bg-white p-4 shadow-elevation-1">
        <div className="flex items-center gap-1.5">
          <span className="mr-auto h-1.5 w-[4.2rem] rounded-full bg-info-100" />
          <span className="h-1.5 w-6 rounded-full bg-secondary-100" />
          <span className="h-1.5 w-6 rounded-full bg-secondary-100" />
          <span className="h-1.5 w-6 rounded-full bg-secondary-100" />
        </div>
        <div className="mt-2.5 grid grid-cols-[1.6fr_1fr] gap-2.5">
          <span className="min-h-[3rem] rounded-md bg-info-100" />
          <span className="min-h-[3rem] rounded-md bg-secondary-100" />
        </div>
        <div className="mt-2.5 grid grid-cols-[1.6fr_1fr] gap-2.5">
          <span className="min-h-[2.4rem] rounded-md bg-secondary-100" />
          <span className="min-h-[2.4rem] rounded-md bg-secondary-100" />
        </div>
      </div>

      <h2 className="mb-1 text-heading-03 text-secondary-1000">Lets build your dashboard</h2>
      <p className="mb-6 text-bodytext-02 text-secondary-500">Create using a prompt or add widgets manually</p>

      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2 rounded-2xl border border-secondary-200 bg-white py-1.5 pl-4 pr-1.5 shadow-elevation-1">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Describe what the dashboard is about..."
          className="min-w-0 flex-1 bg-transparent py-2 text-bodytext-02 text-secondary-1000 outline-none placeholder:text-secondary-400"
        />
        <button
          type="submit"
          aria-label="Generate dashboard"
          className="grid h-9.5 w-9.5 flex-shrink-0 place-items-center rounded-full bg-primary-400 text-white transition-default hover:bg-primary-500"
        >
          <IconArrowUp size={16} />
        </button>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {[...BASE_SUGGESTIONS, ...(showMore ? EXTRA_SUGGESTIONS : [])].map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => onSubmitPrompt(text)}
            className="flex items-center gap-1.5 rounded-full border border-secondary-200 bg-white px-4 py-2.5 text-bodytext-04 text-secondary-1000 transition-default hover:border-secondary-400 hover:bg-secondary-50"
          >
            {text}
            <IconArrowUpRight size={13} className="text-secondary-500" />
          </button>
        ))}
        {!showMore && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="flex items-center gap-1.5 rounded-full border border-secondary-200 bg-white px-4 py-2.5 text-bodytext-04 font-semibold text-secondary-1000 transition-default hover:border-secondary-400 hover:bg-secondary-50"
          >
            more
            <IconDots size={13} />
          </button>
        )}
      </div>

      <div className="my-6 flex w-full items-center gap-4 text-bodytext-04 uppercase tracking-wide text-secondary-500">
        <span className="h-px flex-1 bg-secondary-200" />
        or start with
        <span className="h-px flex-1 bg-secondary-200" />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onExistingInsight}
          className="flex items-center gap-2 rounded-md border border-secondary-200 bg-white px-4 py-2.5 text-label-medium text-secondary-1000 transition-default hover:border-secondary-400 hover:bg-secondary-50"
        >
          <IconFolder size={16} stroke={1.8} />
          Existing Insight
        </button>
        <button
          type="button"
          onClick={onNewInsight}
          className="flex items-center gap-2 rounded-md border border-secondary-200 bg-white px-4 py-2.5 text-label-medium text-secondary-1000 transition-default hover:border-secondary-400 hover:bg-secondary-50"
        >
          <IconBulb size={16} stroke={1.8} />
          New Insight
        </button>
        <button
          type="button"
          onClick={onAddText}
          className="flex items-center gap-2 rounded-md border border-secondary-200 bg-white px-4 py-2.5 text-label-medium text-secondary-1000 transition-default hover:border-secondary-400 hover:bg-secondary-50"
        >
          <IconLetterA size={16} stroke={1.8} />
          Add Text
        </button>
      </div>
    </div>
  )
}
