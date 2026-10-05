import { IconArrowLeft, IconPencil, IconShare2, IconDotsVertical, IconCheck } from '@tabler/icons-react'
import { Button } from '../ui'

interface DashboardHeaderProps {
  mode: 'builder' | 'conversation' | 'result'
  title: string
  description: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  conversationTitle: string
  onConversationTitleChange: (value: string) => void
  onBack: () => void
  copilotOpen: boolean
  onToggleCopilot: () => void
  onClose: () => void
  onSave: () => void
}

function CopilotToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle Ask Whatfix AI"
      aria-pressed={active}
      className="grid h-9.5 w-9.5 flex-shrink-0 place-items-center rounded-md transition-default hover:bg-secondary-50"
      style={active ? { background: 'linear-gradient(135deg, #ffe1ea, #ffe8d6)' } : undefined}
    >
      <svg viewBox="0 0 24 24" width={18} height={18}>
        <g transform="translate(-2,2) scale(0.8)">
          <path
            d="M12 2.5c.7 2.9 1.4 4.4 2.4 5.5 1.1 1 2.6 1.7 5.1 2.3-2.5.6-4 1.3-5.1 2.3-1 1.1-1.7 2.6-2.4 5.4-.7-2.8-1.4-4.3-2.4-5.4-1.1-1-2.6-1.7-5.1-2.3 2.5-.6 4-1.3 5.1-2.3 1-1.1 1.7-2.6 2.4-5.5Z"
            fill="#F55800"
          />
        </g>
        <g transform="translate(9,-4) scale(0.42)">
          <path
            d="M12 2.5c.7 2.9 1.4 4.4 2.4 5.5 1.1 1 2.6 1.7 5.1 2.3-2.5.6-4 1.3-5.1 2.3-1 1.1-1.7 2.6-2.4 5.4-.7-2.8-1.4-4.3-2.4-5.4-1.1-1-2.6-1.7-5.1-2.3 2.5-.6 4-1.3 5.1-2.3 1-1.1 1.7-2.6 2.4-5.5Z"
            fill="#E31429"
          />
        </g>
      </svg>
    </button>
  )
}

export function DashboardHeader({
  mode,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  conversationTitle,
  onConversationTitleChange,
  onBack,
  copilotOpen,
  onToggleCopilot,
  onClose,
  onSave,
}: DashboardHeaderProps) {
  if (mode === 'conversation') {
    return (
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-secondary-200 bg-white px-6 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md text-secondary-500 transition-default hover:bg-secondary-50 hover:text-secondary-1000"
          >
            <IconArrowLeft size={18} />
          </button>
          <input
            value={conversationTitle}
            onChange={(event) => onConversationTitleChange(event.target.value)}
            className="w-full min-w-0 flex-1 truncate rounded-sm bg-transparent px-1 text-subheading-04 text-secondary-1000 outline-none focus:bg-secondary-50"
          />
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button type="button" aria-label="Rename" className="grid h-8 w-8 place-items-center rounded-md border border-transparent text-secondary-500 transition-default hover:border-secondary-200 hover:bg-secondary-50 hover:text-secondary-1000">
            <IconPencil size={16} />
          </button>
          <button type="button" aria-label="Share conversation" className="grid h-8 w-8 place-items-center rounded-md border border-transparent text-secondary-500 transition-default hover:border-secondary-200 hover:bg-secondary-50 hover:text-secondary-1000">
            <IconShare2 size={16} />
          </button>
          <button type="button" aria-label="More options" className="grid h-8 w-8 place-items-center rounded-md border border-transparent text-secondary-500 transition-default hover:border-secondary-200 hover:bg-secondary-50 hover:text-secondary-1000">
            <IconDotsVertical size={16} />
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-secondary-200 bg-white px-6 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col">
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="-ml-1 w-full min-w-0 rounded-sm bg-transparent px-1 text-subheading-03 text-secondary-1000 outline-none focus:bg-secondary-50"
        />
        <input
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="What is this dashboard about? Add a description"
          className="-ml-1 mt-0.5 w-full min-w-0 rounded-sm bg-transparent px-1 text-bodytext-03 italic text-secondary-500 outline-none placeholder:text-secondary-500 focus:bg-secondary-50"
        />
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <CopilotToggle active={copilotOpen} onClick={onToggleCopilot} />
        <Button variant="secondary" intent="muted" size="lg" onClick={onClose}>
          Close
        </Button>
        <Button size="lg" iconRight={<IconCheck size={16} />} onClick={onSave}>
          Save
        </Button>
      </div>
    </header>
  )
}
