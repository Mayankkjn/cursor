import { useState, type FormEvent, type ReactNode } from 'react'
import { IconSparkles, IconDotsVertical, IconArrowsMaximize, IconX, IconPlus, IconArrowUp } from '@tabler/icons-react'

interface CopilotPanelProps {
  open: boolean
  wide: boolean
  onClose: () => void
  onToggleWide: () => void
  onSubmit: (text: string) => void
  children: ReactNode
}

export function CopilotPanel({ open, wide, onClose, onToggleWide, onSubmit, children }: CopilotPanelProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <aside
      className={`flex flex-shrink-0 flex-col overflow-hidden border-l border-secondary-200 bg-white transition-[width,opacity] duration-200 ${
        open ? (wide ? 'w-[620px] opacity-100' : 'w-[420px] opacity-100') : 'w-0 opacity-0'
      }`}
    >
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-secondary-200 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2 text-primary-400">
          <IconSparkles size={16} />
          <h2 className="whitespace-nowrap text-subheading-06 text-secondary-1000">Ask Whatfix AI</h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="More options"
            className="grid h-7.5 w-7.5 place-items-center rounded-sm text-secondary-500 transition-default hover:bg-secondary-50 hover:text-secondary-1000"
          >
            <IconDotsVertical size={16} />
          </button>
          <button
            type="button"
            aria-label="Expand panel"
            onClick={onToggleWide}
            className="grid h-7.5 w-7.5 place-items-center rounded-sm text-secondary-500 transition-default hover:bg-secondary-50 hover:text-secondary-1000"
          >
            <IconArrowsMaximize size={15} />
          </button>
          <button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="grid h-7.5 w-7.5 place-items-center rounded-sm text-secondary-500 transition-default hover:bg-secondary-50 hover:text-secondary-1000"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4">{children}</div>

      <form onSubmit={handleSubmit} className="mx-4 mt-2 flex flex-shrink-0 items-center gap-2 rounded-xl border border-secondary-200 bg-secondary-0 px-2 py-1.5">
        <button
          type="button"
          aria-label="Add context"
          className="grid h-7.5 w-7.5 flex-shrink-0 place-items-center rounded-full border border-secondary-200 bg-white text-secondary-500 transition-default hover:text-secondary-1000"
        >
          <IconPlus size={15} />
        </button>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ask a query, use @ to mention"
          className="min-w-0 flex-1 bg-transparent text-bodytext-03 text-secondary-1000 outline-none placeholder:text-secondary-400"
        />
        <button
          type="submit"
          aria-label="Send"
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary-400 text-white transition-default hover:bg-primary-500"
        >
          <IconArrowUp size={14} />
        </button>
      </form>
      <p className="flex-shrink-0 px-4 pb-3.5 pt-2 text-center text-bodytext-04 text-secondary-400">
        AI can make mistakes, double-check responses
      </p>
    </aside>
  )
}
