import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface SandboxInstance {
  id: string
  name: string
  status: 'running' | 'stopped' | 'starting' | 'error'
  createdAt: number
  lastActiveAt: number
  resources: {
    cpu: string
    memory: string
    storage: string
  }
  environment: Record<string, string>
}

export interface SandboxCommand {
  id: string
  command: string
  output: string
  status: 'running' | 'completed' | 'error'
  timestamp: number
  duration?: number
  sandboxId: string
}

interface SandboxStoreState {
  sandboxes: Record<string, SandboxInstance>
  activeSandboxId: string | null
  commandHistory: Record<string, SandboxCommand[]>
  isExecuting: boolean
}

interface SandboxStoreActions {
  createSandbox: (name: string) => string
  deleteSandbox: (sandboxId: string) => void
  setActiveSandbox: (sandboxId: string) => void
  updateSandboxStatus: (sandboxId: string, status: SandboxInstance['status']) => void
  addCommand: (sandboxId: string, command: string) => string
  updateCommandOutput: (sandboxId: string, commandId: string, output: string, status: SandboxCommand['status'], duration?: number) => void
  clearHistory: (sandboxId: string) => void
  setExecuting: (isExecuting: boolean) => void
}

const initialState: SandboxStoreState = {
  sandboxes: {},
  activeSandboxId: null,
  commandHistory: {},
  isExecuting: false
}

export const useSandboxStore = create<SandboxStoreState & SandboxStoreActions>()(
  immer((set, get) => ({
    ...initialState,

    createSandbox: (name) => {
      const sandboxId = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      set(state => {
        state.sandboxes[sandboxId] = {
          id: sandboxId,
          name,
          status: 'starting',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          resources: {
            cpu: '2 vCPU',
            memory: '4 GB',
            storage: '10 GB'
          },
          environment: {
            NODE_ENV: 'development',
            VERCEL_ENV: 'preview'
          }
        }
        state.commandHistory[sandboxId] = []
        state.activeSandboxId = sandboxId
        
        // Simulate startup
        setTimeout(() => {
          set(s => {
            if (s.sandboxes[sandboxId]) {
              s.sandboxes[sandboxId].status = 'running'
            }
          })
        }, 1500)
      })
      return sandboxId
    },

    deleteSandbox: (sandboxId) => {
      set(state => {
        delete state.sandboxes[sandboxId]
        delete state.commandHistory[sandboxId]
        if (state.activeSandboxId === sandboxId) {
          const remaining = Object.keys(state.sandboxes)
          state.activeSandboxId = remaining.length > 0 ? remaining[0] : null
        }
      })
    },

    setActiveSandbox: (sandboxId) => {
      set(state => {
        state.activeSandboxId = sandboxId
        if (state.sandboxes[sandboxId]) {
          state.sandboxes[sandboxId].lastActiveAt = Date.now()
        }
      })
    },

    updateSandboxStatus: (sandboxId, status) => {
      set(state => {
        if (state.sandboxes[sandboxId]) {
          state.sandboxes[sandboxId].status = status
        }
      })
    },

    addCommand: (sandboxId, command) => {
      const commandId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      set(state => {
        if (!state.commandHistory[sandboxId]) {
          state.commandHistory[sandboxId] = []
        }
        state.commandHistory[sandboxId].push({
          id: commandId,
          command,
          output: '',
          status: 'running',
          timestamp: Date.now(),
          sandboxId
        })
        if (state.sandboxes[sandboxId]) {
          state.sandboxes[sandboxId].lastActiveAt = Date.now()
        }
      })
      return commandId
    },

    updateCommandOutput: (sandboxId, commandId, output, status, duration) => {
      set(state => {
        const history = state.commandHistory[sandboxId]
        if (history) {
          const idx = history.findIndex(c => c.id === commandId)
          if (idx !== -1) {
            history[idx].output = output
            history[idx].status = status
            if (duration !== undefined) {
              history[idx].duration = duration
            }
          }
        }
      })
    },

    clearHistory: (sandboxId) => {
      set(state => {
        state.commandHistory[sandboxId] = []
      })
    },

    setExecuting: (isExecuting) => {
      set(state => {
        state.isExecuting = isExecuting
      })
    }
  }))
)
