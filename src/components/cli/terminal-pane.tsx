'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useCLIStore, selectPaneHistory } from '@/lib/cli/store'
import { parseCommand } from '@/lib/cli/command-parser'
import { executeCommand } from '@/lib/cli/commands'
import type { CommandContext, CommandOutput, CommandHistoryEntry } from '@/lib/cli/types'

interface TerminalPaneProps {
  paneId: string
}

export function TerminalPane({ paneId }: TerminalPaneProps) {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  
  const { 
    panes, 
    commandHistory, 
    user, 
    token, 
    addCommandOutput,
    clearHistory,
    setActivePane
  } = useCLIStore()
  
  const pane = panes[paneId]
  const history = commandHistory[paneId] || []

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [history])

  // Focus input when pane becomes active
  useEffect(() => {
    if (pane?.isActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [pane?.isActive])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedInput = input.trim()
    if (!trimmedInput) return
    
    setInput('')
    setHistoryIndex(-1)

    // Create command entry
    const commandId = Math.random().toString(36).substring(2, 9)
    const entry: CommandHistoryEntry = {
      id: commandId,
      command: trimmedInput,
      timestamp: Date.now(),
      paneId,
      outputs: [],
      status: 'running'
    }

    // Add to history
    useCLIStore.setState(state => ({
      commandHistory: {
        ...state.commandHistory,
        [paneId]: [...(state.commandHistory[paneId] || []), entry]
      }
    }))

    // Parse and execute
    const parsed = parseCommand(trimmedInput)
    
    // Create context
    const context: CommandContext = {
      paneId,
      user,
      token,
      addOutput: (output) => {
        addCommandOutput(paneId, commandId, output)
      },
      streamOutput: (content) => {
        addCommandOutput(paneId, commandId, { type: 'stream', content, isStreaming: true })
      }
    }

    try {
      const result = await executeCommand(parsed, context)
      
      // Handle special actions
      if (result.data) {
        const data = result.data as { action?: string }
        if (data.action === 'clear') {
          clearHistory(paneId)
          return
        }
        if (data.action === 'logout') {
          useCLIStore.getState().logout()
        }
      }

      // Add outputs
      for (const output of result.outputs) {
        addCommandOutput(paneId, commandId, output)
      }

      // Mark complete
      useCLIStore.setState(state => {
        const history = state.commandHistory[paneId]
        const idx = history.findIndex(e => e.id === commandId)
        if (idx !== -1) {
          history[idx].status = result.success ? 'completed' : 'error'
          history[idx].duration = Date.now() - entry.timestamp
        }
        return { commandHistory: { ...state.commandHistory, [paneId]: [...history] } }
      })
    } catch (error) {
      addCommandOutput(paneId, commandId, {
        type: 'error',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      
      useCLIStore.setState(state => {
        const history = state.commandHistory[paneId]
        const idx = history.findIndex(e => e.id === commandId)
        if (idx !== -1) {
          history[idx].status = 'error'
        }
        return { commandHistory: { ...state.commandHistory, [paneId]: [...history] } }
      })
    }
  }, [input, paneId, user, token, addCommandOutput, clearHistory])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // History navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const commands = history.map(h => h.command)
      if (commands.length > 0) {
        const newIndex = historyIndex < commands.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(commands[commands.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        const commands = history.map(h => h.command)
        setInput(commands[commands.length - 1 - newIndex] || '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
    
    // Tab completion (basic)
    if (e.key === 'Tab') {
      e.preventDefault()
      // Could implement tab completion here
    }
  }

  const handleClick = () => {
    setActivePane(paneId)
    inputRef.current?.focus()
  }

  if (!pane) return null

  return (
    <div 
      className={`flex flex-col h-full bg-[#0a0a0a] ${pane.isActive ? 'ring-1 ring-[#2d5a27]' : ''}`}
      onClick={handleClick}
    >
      {/* Pane Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d0d0d] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${pane.isActive ? 'bg-[#4ade80]' : 'bg-[#404040]'}`} />
          <span className="text-xs text-[#808080] font-medium">{pane.title}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#505050]">
          {user && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              {user.login}
            </span>
          )}
        </div>
      </div>

      {/* Output Area */}
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-2"
      >
        {history.length === 0 && (
          <div className="text-[#505050]">
            <p>GitHub Cloud CLI - Type &quot;help&quot; for available commands</p>
            {!user && <p className="text-[#606060] mt-1">Sign in with GitHub to access your repositories.</p>}
          </div>
        )}
        
        {history.map((entry) => (
          <CommandEntry key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex items-center border-t border-[#1a1a1a] bg-[#0d0d0d]">
        <span className="pl-3 pr-1 text-[#4ade80] font-mono text-sm select-none">
          {user ? `${user.login}@gh` : 'guest@gh'}
        </span>
        <span className="text-[#505050] font-mono text-sm select-none">:</span>
        <span className="text-[#60a5fa] font-mono text-sm select-none px-1">~</span>
        <span className="text-[#505050] font-mono text-sm select-none">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-[#e0e0e0] font-mono text-sm placeholder:text-[#404040]"
          placeholder={user ? 'Type a command...' : 'Sign in to use commands'}
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  )
}

function CommandEntry({ entry }: { entry: CommandHistoryEntry }) {
  return (
    <div className="space-y-1">
      {/* Command */}
      <div className="flex items-start gap-2">
        <span className="text-[#4ade80] select-none">$</span>
        <span className="text-[#e0e0e0]">{entry.command}</span>
        {entry.status === 'running' && (
          <span className="text-[#f59e0b] animate-pulse ml-auto text-xs">running...</span>
        )}
        {entry.duration !== undefined && (
          <span className="text-[#505050] ml-auto text-xs">{entry.duration}ms</span>
        )}
      </div>
      
      {/* Outputs */}
      {entry.outputs.map((output) => (
        <OutputBlock key={output.id} output={output} />
      ))}
    </div>
  )
}

function OutputBlock({ output }: { output: CommandOutput }) {
  const getColorClass = () => {
    switch (output.type) {
      case 'success': return 'text-[#4ade80]'
      case 'error': return 'text-[#ef4444]'
      case 'warning': return 'text-[#f59e0b]'
      case 'table': return 'text-[#c0c0c0]'
      case 'json': return 'text-[#60a5fa]'
      case 'stream': return 'text-[#909090]'
      default: return 'text-[#a0a0a0]'
    }
  }

  return (
    <pre className={`whitespace-pre-wrap break-words pl-4 ${getColorClass()} ${output.isStreaming ? 'animate-pulse' : ''}`}>
      {output.content}
    </pre>
  )
}
