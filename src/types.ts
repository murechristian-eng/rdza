export type ToolAvailability = 'available' | 'degraded' | 'unavailable'

export interface ToolStatus {
  id: string
  name: string
  icon: string
  category: 'runtime' | 'agent' | 'framework' | 'memory' | 'system'
  availability: ToolAvailability
  notes: string
  fixSuggestion: string
}

export interface FeedbackEntry {
  id: string
  category: 'bug' | 'feature' | 'improvement' | 'question'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  steps: string
  aiCategory?: string
  aiPriority?: string
  aiReformulation?: string
  timestamp: number
}

export interface QAChecklistItem {
  id: string
  section: string
  label: string
  checked: boolean
  comment: string
}

export type AppView = 'tools' | 'feedback' | 'checklist' | 'ai'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}
