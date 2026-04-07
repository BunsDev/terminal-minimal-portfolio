// CLI State Store using Zustand
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { CLIStore, Pane, PaneTreeNode, CommandHistoryEntry, CommandOutput, GitHubUser } from './types'

const generateId = () => Math.random().toString(36).substring(2, 9)

// Build tree structure from flat panes
const buildPaneTree = (panes: Record<string, Pane>, rootId: string | null): PaneTreeNode | null => {
  if (!rootId || !panes[rootId]) return null
  
  const children = Object.values(panes)
    .filter(p => p.parentId === rootId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(p => buildPaneTree(panes, p.id))
    .filter((node): node is PaneTreeNode => node !== null)

  return {
    pane: panes[rootId],
    children
  }
}

// Find root pane
const findRootPane = (panes: Record<string, Pane>): string | null => {
  const root = Object.values(panes).find(p => p.parentId === null)
  return root?.id || null
}

export const useCLIStore = create<CLIStore>()(
  immer((set, get) => {
    // Create initial root pane
    const rootPaneId = generateId()
    const initialPane: Pane = {
      id: rootPaneId,
      type: 'terminal',
      title: 'Terminal 1',
      parentId: null,
      splitDirection: null,
      size: 100,
      isActive: true,
      createdAt: Date.now()
    }

    return {
      // Initial state
      panes: { [rootPaneId]: initialPane },
      paneTree: { pane: initialPane, children: [] },
      activePaneId: rootPaneId,
      commandHistory: { [rootPaneId]: [] },
      user: null,
      token: null,
      isAuthenticated: false,
      sidebarCollapsed: false,
      theme: 'dark',
      currentRepo: null,
      currentOrg: null,

      // Pane actions
      createPane: (options) => {
        const id = generateId()
        const panes = get().panes
        const paneCount = Object.keys(panes).length + 1

        set(state => {
          const newPane: Pane = {
            id,
            type: options.type || 'terminal',
            title: options.title || `Terminal ${paneCount}`,
            parentId: options.parentId || null,
            splitDirection: options.splitDirection || null,
            size: options.size || 100,
            isActive: true,
            createdAt: Date.now()
          }

          // Deactivate all other panes
          Object.values(state.panes).forEach(p => {
            p.isActive = false
          })

          state.panes[id] = newPane
          state.activePaneId = id
          state.commandHistory[id] = []

          // Rebuild tree
          const rootId = findRootPane(state.panes)
          state.paneTree = buildPaneTree(state.panes, rootId)
        })

        return id
      },

      splitPane: (paneId, direction) => {
        const panes = get().panes
        const sourcePane = panes[paneId]
        if (!sourcePane) return paneId

        const newPaneId = generateId()
        const paneCount = Object.keys(panes).length + 1

        set(state => {
          // Update source pane
          state.panes[paneId].splitDirection = direction
          state.panes[paneId].size = 50
          state.panes[paneId].isActive = false

          // Create new pane as sibling
          const newPane: Pane = {
            id: newPaneId,
            type: 'terminal',
            title: `Terminal ${paneCount}`,
            parentId: sourcePane.parentId,
            splitDirection: null,
            size: 50,
            isActive: true,
            createdAt: Date.now()
          }

          state.panes[newPaneId] = newPane
          state.activePaneId = newPaneId
          state.commandHistory[newPaneId] = []

          // Rebuild tree
          const rootId = findRootPane(state.panes)
          state.paneTree = buildPaneTree(state.panes, rootId)
        })

        return newPaneId
      },

      closePane: (paneId) => {
        const panes = get().panes
        const paneCount = Object.keys(panes).length

        // Don't close the last pane
        if (paneCount <= 1) return

        set(state => {
          const closingPane = state.panes[paneId]
          if (!closingPane) return

          // Find sibling panes
          const siblings = Object.values(state.panes).filter(
            p => p.parentId === closingPane.parentId && p.id !== paneId
          )

          // Give space to siblings
          if (siblings.length > 0) {
            const extraSize = closingPane.size / siblings.length
            siblings.forEach(sibling => {
              state.panes[sibling.id].size += extraSize
            })
          }

          // Remove the pane
          delete state.panes[paneId]
          delete state.commandHistory[paneId]

          // Set new active pane
          if (state.activePaneId === paneId) {
            const remaining = Object.values(state.panes)
            if (remaining.length > 0) {
              state.activePaneId = remaining[0].id
              state.panes[remaining[0].id].isActive = true
            }
          }

          // Rebuild tree
          const rootId = findRootPane(state.panes)
          state.paneTree = buildPaneTree(state.panes, rootId)
        })
      },

      setActivePane: (paneId) => {
        set(state => {
          if (!state.panes[paneId]) return

          Object.values(state.panes).forEach(p => {
            p.isActive = p.id === paneId
          })
          state.activePaneId = paneId
        })
      },

      resizePane: (paneId, size) => {
        set(state => {
          if (!state.panes[paneId]) return
          state.panes[paneId].size = Math.max(10, Math.min(90, size))
        })
      },

      // Command actions
      executeCommand: async (paneId, command) => {
        const commandId = generateId()
        const entry: CommandHistoryEntry = {
          id: commandId,
          command,
          timestamp: Date.now(),
          paneId,
          outputs: [],
          status: 'pending'
        }

        set(state => {
          if (!state.commandHistory[paneId]) {
            state.commandHistory[paneId] = []
          }
          state.commandHistory[paneId].push(entry)
        })

        // Command execution will be handled by the command processor
        set(state => {
          const history = state.commandHistory[paneId]
          const entryIndex = history.findIndex(e => e.id === commandId)
          if (entryIndex !== -1) {
            history[entryIndex].status = 'running'
          }
        })
      },

      addCommandOutput: (paneId, commandId, output) => {
        set(state => {
          const history = state.commandHistory[paneId]
          if (!history) return

          const entryIndex = history.findIndex(e => e.id === commandId)
          if (entryIndex === -1) return

          history[entryIndex].outputs.push({
            ...output,
            id: generateId(),
            timestamp: Date.now()
          })
        })
      },

      clearHistory: (paneId) => {
        set(state => {
          state.commandHistory[paneId] = []
        })
      },

      // Auth actions
      setUser: (user) => {
        set(state => {
          state.user = user
          state.isAuthenticated = user !== null
        })
      },

      setToken: (token) => {
        set(state => {
          state.token = token
        })
      },

      logout: () => {
        set(state => {
          state.user = null
          state.token = null
          state.isAuthenticated = false
          state.currentRepo = null
          state.currentOrg = null
        })
      },

      // UI actions
      toggleSidebar: () => {
        set(state => {
          state.sidebarCollapsed = !state.sidebarCollapsed
        })
      },

      setTheme: (theme) => {
        set(state => {
          state.theme = theme
        })
      },

      // Context actions
      setCurrentRepo: (repo) => {
        set(state => {
          state.currentRepo = repo
        })
      },

      setCurrentOrg: (org) => {
        set(state => {
          state.currentOrg = org
        })
      }
    }
  })
)

// Selectors
export const selectActivePane = (state: CLIStore) => 
  state.activePaneId ? state.panes[state.activePaneId] : null

export const selectPaneHistory = (paneId: string) => (state: CLIStore) =>
  state.commandHistory[paneId] || []

export const selectIsAuthenticated = (state: CLIStore) => state.isAuthenticated

export const selectUser = (state: CLIStore) => state.user
