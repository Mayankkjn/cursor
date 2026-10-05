import { useState, useRef, type FormEvent, Fragment } from 'react'
import {
  IconLayoutDashboard,
  IconChartBar,
  IconTrendingUp,
  IconUsers,
  IconSettings,
  IconChevronDown,
  IconSparkles,
  IconArrowUp,
} from '@tabler/icons-react'
import { PageLayout, Sidebar } from '../components/layout'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { BuilderEmptyState } from '../components/dashboard/BuilderEmptyState'
import { GeneratedDashboard } from '../components/dashboard/GeneratedDashboard'
import { QuestionCard } from '../components/chat/QuestionCard'
import { CopilotPanel } from '../components/chat/CopilotPanel'
import {
  UserBubble,
  AssistantLine,
  SummaryList,
  BuildingRow,
  SkeletonBars,
  DashboardSummaryCard,
  DigFurtherChips,
} from '../components/chat/ChatMessages'
import {
  QUESTIONS,
  FOLLOWUP_REPLIES,
  deriveConversationTitle,
  deriveDashboardName,
  buildDashboardData,
  type Answer,
  type DashboardData,
} from './builderData'
import type { NavItem } from '../types'

const NAV_ITEMS: NavItem[] = [
  { id: 'reports', label: 'Reports', icon: <IconLayoutDashboard size={22} stroke={2} /> },
  { id: 'analytics', label: 'Analytics', icon: <IconChartBar size={22} stroke={2} /> },
  { id: 'trends', label: 'Trends', icon: <IconTrendingUp size={22} stroke={2} /> },
  { id: 'people', label: 'People', icon: <IconUsers size={22} stroke={2} /> },
  { id: 'settings', label: 'Settings', icon: <IconSettings size={22} stroke={2} /> },
]

type Mode = 'builder' | 'conversation' | 'result'
type ResultStage = 'generating' | 'canvas'
type CopilotStage = 'building' | 'ready'

interface Followup {
  question: string
  reply: string
}

function ThinkingBlock() {
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-bodytext-04 text-secondary-500"
      >
        <IconSparkles size={14} className="text-primary-400" />
        Show thinking
        <IconChevronDown size={13} className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <p className="mt-2 text-bodytext-04 italic text-secondary-500">
          Analyzing your prompt to identify relevant metrics, data sources, and the audience for this dashboard...
        </p>
      )}
      <p className="mt-2 text-bodytext-03 text-secondary-1000">Please answer few question to know more about the dashboard</p>
    </div>
  )
}

function ChatInputBar({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('')
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }
  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[720px] items-center gap-2 rounded-2xl border border-secondary-200 bg-white py-1.5 pl-4 pr-1.5 shadow-elevation-1">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type your query here..."
        className="min-w-0 flex-1 bg-transparent py-2 text-bodytext-02 text-secondary-1000 outline-none placeholder:text-secondary-400"
      />
      <button type="submit" aria-label="Send" className="grid h-9.5 w-9.5 flex-shrink-0 place-items-center rounded-full bg-primary-400 text-white transition-default hover:bg-primary-500">
        <IconArrowUp size={15} />
      </button>
    </form>
  )
}

function GeneratingSpinner() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-secondary-1000">
      <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-secondary-200 border-t-primary-400" />
      <p className="text-subheading-04">Generating your dashboard...</p>
    </div>
  )
}

export function DashboardBuilderView() {
  const [mode, setMode] = useState<Mode>('builder')
  const [resultStage, setResultStage] = useState<ResultStage>('generating')
  const [copilotStage, setCopilotStage] = useState<CopilotStage>('building')

  const [promptText, setPromptText] = useState('')
  const [conversationTitle, setConversationTitle] = useState('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])

  const [title, setTitle] = useState('Untitled dashboard')
  const [description, setDescription] = useState('')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  const [copilotOpen, setCopilotOpen] = useState(false)
  const [copilotWide, setCopilotWide] = useState(false)
  const [followups, setFollowups] = useState<Followup[]>([])

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const currentQuestion = QUESTIONS[questionIndex]
  const currentAnswer = answers[questionIndex]

  const startConversation = (text: string) => {
    setPromptText(text)
    setConversationTitle(deriveConversationTitle(text))
    setQuestionIndex(0)
    setAnswers([])
    setFollowups([])
    setCopilotOpen(false)
    setCopilotStage('building')
    setMode('conversation')
  }

  const finishConversation = (finalAnswers: Answer[], text: string) => {
    const data = buildDashboardData(text)
    setTitle(deriveDashboardName(text))
    setDescription((prev) => (prev.trim() ? prev : text))
    setMode('result')
    setResultStage('generating')
    setCopilotStage('building')
    setCopilotOpen(true)
    void finalAnswers

    setTimeout(() => {
      setDashboardData(data)
      setResultStage('canvas')
      setCopilotStage('ready')
      showToast('Dashboard generated from your prompt')
    }, 1400)
  }

  const applyAnswer = (answer: Answer) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[questionIndex] = answer
      return next
    })
  }

  const advance = (answer?: Answer) => {
    const resolved = answer ?? currentAnswer
    if (!resolved || !resolved.label.trim()) return
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex((i) => i + 1)
    } else {
      const finalAnswers = [...answers]
      finalAnswers[questionIndex] = resolved
      finishConversation(finalAnswers, promptText)
    }
  }

  const handleSelect = (key: string, label: string) => {
    const answer = { key, label }
    applyAnswer(answer)
  }

  const handleFreeText = (key: string, label: string) => {
    applyAnswer({ key, label })
  }

  const handleContinue = () => advance()

  const handlePrev = () => {
    if (questionIndex > 0) setQuestionIndex((i) => i - 1)
  }

  const handleChatBarSubmit = (text: string) => {
    const freeTextOption = currentQuestion.options.find((o) => o.freeText)!
    const answer = { key: freeTextOption.key, label: text }
    applyAnswer(answer)
    advance(answer)
  }

  const backToBuilder = () => {
    setMode('builder')
    setDashboardData(null)
    setCopilotOpen(false)
    setCopilotWide(false)
    setPromptText('')
    setFollowups([])
    setCopilotStage('building')
  }

  const generateManualDashboard = (toastMessage: string) => {
    const data = buildDashboardData('general product activity')
    setDashboardData(data)
    setMode('result')
    setResultStage('canvas')
    showToast(toastMessage)
  }

  const handleFollowupSelect = (question: string) => {
    setFollowups((prev) => [...prev, { question, reply: FOLLOWUP_REPLIES[question] ?? 'Let me look into that.' }])
  }

  const handleCopilotSubmit = (text: string) => {
    setFollowups((prev) => [...prev, { question: text, reply: "Got it — I'll factor that into the dashboard." }])
  }

  return (
    <PageLayout
      sidebar={
        <Sidebar
          items={NAV_ITEMS}
          activeItemId="analytics"
          userName="User"
          defaultCollapsed
          onItemClick={(item) => {
            if (item.id === 'chat') setCopilotOpen((v) => !v)
          }}
        />
      }
      header={
        <DashboardHeader
          mode={mode}
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          conversationTitle={conversationTitle}
          onConversationTitleChange={setConversationTitle}
          onBack={backToBuilder}
          copilotOpen={copilotOpen}
          onToggleCopilot={() => setCopilotOpen((v) => !v)}
          onClose={() => showToast('Draft discarded')}
          onSave={() => showToast('Dashboard saved')}
        />
      }
    >
      <div className="flex h-full">
        <div className="min-w-0 flex-1 overflow-y-auto">
          {mode === 'builder' && (
            <BuilderEmptyState
              onSubmitPrompt={startConversation}
              onExistingInsight={() => showToast('Select an existing insight to add it here')}
              onNewInsight={() => generateManualDashboard('New insight added')}
              onAddText={() => generateManualDashboard('Text block added')}
            />
          )}

          {mode === 'conversation' && (
            <div className="mx-auto flex h-full max-w-[760px] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-8">
                <UserBubble text={promptText} />
                <ThinkingBlock />
                <QuestionCard
                  question={currentQuestion}
                  index={questionIndex}
                  total={QUESTIONS.length}
                  answer={currentAnswer}
                  onSelect={handleSelect}
                  onFreeText={handleFreeText}
                  onContinue={handleContinue}
                  onPrev={handlePrev}
                />
              </div>
              <div className="flex-shrink-0 px-6 pb-2">
                <ChatInputBar onSubmit={handleChatBarSubmit} />
              </div>
              <p className="flex-shrink-0 pb-4 text-center text-bodytext-04 text-secondary-400">
                AI can make mistakes, double-check responses
              </p>
            </div>
          )}

          {mode === 'result' && resultStage === 'generating' && <GeneratingSpinner />}
          {mode === 'result' && resultStage === 'canvas' && dashboardData && <GeneratedDashboard data={dashboardData} />}
        </div>

        <CopilotPanel
          open={copilotOpen}
          wide={copilotWide}
          onClose={() => setCopilotOpen(false)}
          onToggleWide={() => setCopilotWide((v) => !v)}
          onSubmit={handleCopilotSubmit}
        >
          {mode === 'result' && promptText && (
            <>
              <UserBubble text={promptText} />
              <AssistantLine text="Please answer few question to know more about the dashboard" />
              {answers.length === QUESTIONS.length && <SummaryList questions={QUESTIONS} answers={answers} />}
              <BuildingRow ready={copilotStage === 'ready'} />
              {copilotStage === 'building' && <SkeletonBars />}
              {copilotStage === 'ready' && (
                <>
                  <DashboardSummaryCard name={title} />
                  <DigFurtherChips onSelect={handleFollowupSelect} />
                </>
              )}
              {followups.map((followup, index) => (
                <Fragment key={index}>
                  <UserBubble text={followup.question} />
                  <AssistantLine text={followup.reply} />
                </Fragment>
              ))}
            </>
          )}
        </CopilotPanel>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-secondary-1000 px-4 py-2.5 text-bodytext-03 text-white shadow-elevation-4">
          {toast}
        </div>
      )}
    </PageLayout>
  )
}
