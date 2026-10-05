import { IconChevronUp, IconChevronDown, IconFileText } from '@tabler/icons-react'
import { Button } from '../../components/ui'
import type { Answer, Question } from '../../views/builderData'

interface QuestionCardProps {
  question: Question
  index: number
  total: number
  answer?: Answer
  onSelect: (key: string, label: string) => void
  onFreeText: (key: string, label: string) => void
  onContinue: () => void
  onPrev: () => void
}

function isAnswerValid(answer?: Answer) {
  return Boolean(answer && answer.label.trim())
}

export function QuestionCard({ question, index, total, answer, onSelect, onFreeText, onContinue, onPrev }: QuestionCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-secondary-200 bg-white shadow-elevation-1">
      <div className="flex items-center gap-2 border-b border-secondary-200 px-4 py-3">
        <IconFileText size={17} stroke={1.6} className="flex-shrink-0 text-secondary-500" />
        <h3 className="flex-1 truncate text-subheading-06 text-secondary-1000">{question.title}</h3>
        <div className="flex flex-shrink-0 items-center gap-1 text-bodytext-04 text-secondary-500">
          <button
            type="button"
            aria-label="Previous question"
            disabled={index === 0}
            onClick={onPrev}
            className="grid h-6 w-6 place-items-center rounded-sm transition-default hover:bg-secondary-50 hover:text-secondary-1000 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <IconChevronUp size={13} stroke={2.2} />
          </button>
          <span>
            {index + 1} of {total}
          </span>
          <button
            type="button"
            aria-label="Next question"
            onClick={onContinue}
            className="grid h-6 w-6 place-items-center rounded-sm transition-default hover:bg-secondary-50 hover:text-secondary-1000"
          >
            <IconChevronDown size={13} stroke={2.2} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        {question.options.map((option) => {
          const selected = answer?.key === option.key
          if (option.freeText) {
            return (
              <label
                key={option.key}
                className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 transition-default ${
                  selected ? 'border-primary-400 bg-primary-50' : 'border-secondary-200 hover:border-secondary-400'
                }`}
              >
                <span
                  className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-sm border text-label-small font-bold ${
                    selected ? 'border-primary-400 bg-primary-400 text-white' : 'border-secondary-200 bg-secondary-50 text-secondary-500'
                  }`}
                >
                  {option.key}
                </span>
                <input
                  type="text"
                  placeholder={option.label}
                  value={selected ? answer?.label ?? '' : ''}
                  onChange={(event) => onFreeText(option.key, event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-bodytext-03 text-secondary-1000 outline-none placeholder:text-secondary-400"
                />
              </label>
            )
          }
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key, option.label)}
              className={`flex w-full items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-left text-bodytext-03 text-secondary-1000 transition-default ${
                selected ? 'border-primary-400 bg-primary-50' : 'border-secondary-200 hover:border-secondary-400'
              }`}
            >
              <span
                className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-sm border text-label-small font-bold ${
                  selected ? 'border-primary-400 bg-primary-400 text-white' : 'border-secondary-200 bg-secondary-50 text-secondary-500'
                }`}
              >
                {option.key}
              </span>
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="flex justify-end border-t border-secondary-200 px-4 py-3">
        <Button size="sm" disabled={!isAnswerValid(answer)} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  )
}
