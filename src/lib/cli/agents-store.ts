import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// Agent message types
export interface AgentMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  agentId?: string
  agentName?: string
  content: string
  timestamp: number
  status?: 'pending' | 'streaming' | 'complete' | 'error'
  metadata?: Record<string, unknown>
}

export interface AgentSession {
  id: string
  title: string
  agentId: string
  agentName: string
  messages: AgentMessage[]
  createdAt: number
  isActive: boolean
}

interface AgentsStoreState {
  sessions: Record<string, AgentSession>
  activeSessionId: string | null
  isProcessing: boolean
}

interface AgentsStoreActions {
  createSession: (agentId: string, agentName: string) => string
  closeSession: (sessionId: string) => void
  setActiveSession: (sessionId: string) => void
  addMessage: (sessionId: string, message: Omit<AgentMessage, 'id' | 'timestamp'>) => void
  updateMessage: (sessionId: string, messageId: string, updates: Partial<AgentMessage>) => void
  clearSession: (sessionId: string) => void
  setProcessing: (isProcessing: boolean) => void
}

const initialState: AgentsStoreState = {
  sessions: {},
  activeSessionId: null,
  isProcessing: false
}

export const useAgentsStore = create<AgentsStoreState & AgentsStoreActions>()(
  immer((set, get) => ({
    ...initialState,

    createSession: (agentId, agentName) => {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      set(state => {
        // Deactivate other sessions
        Object.keys(state.sessions).forEach(id => {
          state.sessions[id].isActive = false
        })
        
        state.sessions[sessionId] = {
          id: sessionId,
          title: `${agentName} Session`,
          agentId,
          agentName,
          messages: [{
            id: `msg-${Date.now()}`,
            role: 'system',
            content: `Connected to ${agentName}. Type "help" to see available commands.`,
            timestamp: Date.now(),
            status: 'complete'
          }],
          createdAt: Date.now(),
          isActive: true
        }
        state.activeSessionId = sessionId
      })
      return sessionId
    },

    closeSession: (sessionId) => {
      set(state => {
        delete state.sessions[sessionId]
        if (state.activeSessionId === sessionId) {
          const remaining = Object.keys(state.sessions)
          state.activeSessionId = remaining.length > 0 ? remaining[0] : null
          if (state.activeSessionId) {
            state.sessions[state.activeSessionId].isActive = true
          }
        }
      })
    },

    setActiveSession: (sessionId) => {
      set(state => {
        Object.keys(state.sessions).forEach(id => {
          state.sessions[id].isActive = id === sessionId
        })
        state.activeSessionId = sessionId
      })
    },

    addMessage: (sessionId, message) => {
      set(state => {
        if (state.sessions[sessionId]) {
          state.sessions[sessionId].messages.push({
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now()
          })
        }
      })
    },

    updateMessage: (sessionId, messageId, updates) => {
      set(state => {
        const session = state.sessions[sessionId]
        if (session) {
          const idx = session.messages.findIndex(m => m.id === messageId)
          if (idx !== -1) {
            Object.assign(session.messages[idx], updates)
          }
        }
      })
    },

    clearSession: (sessionId) => {
      set(state => {
        if (state.sessions[sessionId]) {
          const agentName = state.sessions[sessionId].agentName
          state.sessions[sessionId].messages = [{
            id: `msg-${Date.now()}`,
            role: 'system',
            content: `Session cleared. Connected to ${agentName}.`,
            timestamp: Date.now(),
            status: 'complete'
          }]
        }
      })
    },

    setProcessing: (isProcessing) => {
      set(state => {
        state.isProcessing = isProcessing
      })
    }
  }))
)
