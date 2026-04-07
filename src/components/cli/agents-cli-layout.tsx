'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useAgentsStore, type AgentMessage } from '@/lib/cli/agents-store'
import { getAllAgents, type AgentRole } from '@/lib/agents'

const AVAILABLE_AGENTS = [
  { id: 'orchestrator', name: 'Orchestrator', role: 'orchestrator' as AgentRole, description: 'Routes tasks to specialized agents' },
  { id: 'github', name: 'GitHub Agent', role: 'github' as AgentRole, description: 'Repository, PR, and issue management' },
  { id: 'codebase', name: 'Codebase Agent', role: 'codebase' as AgentRole, description: 'Code search and analysis' },
  { id: 'devops', name: 'DevOps Agent', role: 'devops' as AgentRole, description: 'CI/CD and deployment automation' }
]

export function AgentsCLILayout() {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  
  const {
    sessions,
    activeSessionId,
    isProcessing,
    createSession,
    closeSession,
    setActiveSession,
    addMessage,
    clearSession,
    setProcessing
  } = useAgentsStore()

  const activeSession = activeSessionId ? sessions[activeSessionId] : null
  const sessionList = Object.values(sessions)

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [activeSession?.messages])

  // Create default session on mount
  useEffect(() => {
    if (sessionList.length === 0) {
      createSession('orchestrator', 'Orchestrator')
    }
  }, [sessionList.length, createSession])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || !activeSessionId || isProcessing) return

    setInput('')
    
    // Handle special commands
    if (trimmed === 'clear') {
      clearSession(activeSessionId)
      return
    }

    if (trimmed === 'help') {
      addMessage(activeSessionId, {
        role: 'agent',
        agentName: 'System',
        content: `Available commands:
  help              - Show this help message
  clear             - Clear session history
  agents            - List available agents
  connect <agent>   - Connect to a specific agent
  status            - Show current agent status
  
Agent-specific commands depend on the connected agent.
Type the agent name to see its capabilities.`,
        status: 'complete'
      })
      return
    }

    if (trimmed === 'agents') {
      addMessage(activeSessionId, {
        role: 'agent',
        agentName: 'System',
        content: `Available Agents:
${AVAILABLE_AGENTS.map(a => `  ${a.id.padEnd(14)} - ${a.description}`).join('\n')}

Use "connect <agent-id>" to start a session with an agent.`,
        status: 'complete'
      })
      return
    }

    if (trimmed.startsWith('connect ')) {
      const agentId = trimmed.slice(8).trim()
      const agent = AVAILABLE_AGENTS.find(a => a.id === agentId)
      if (agent) {
        createSession(agent.id, agent.name)
        return
      } else {
        addMessage(activeSessionId, {
          role: 'system',
          content: `Unknown agent: ${agentId}. Type "agents" to see available agents.`,
          status: 'complete'
        })
        return
      }
    }

    // Add user message
    addMessage(activeSessionId, {
      role: 'user',
      content: trimmed,
      status: 'complete'
    })

    // Simulate agent response
    setProcessing(true)
    const agentName = activeSession?.agentName || 'Agent'
    
    // Create pending message
    const responseId = `msg-${Date.now()}`
    addMessage(activeSessionId, {
      role: 'agent',
      agentId: activeSession?.agentId,
      agentName,
      content: '',
      status: 'streaming'
    })

    // Simulate streaming response
    setTimeout(() => {
      const responses: Record<string, string> = {
        'orchestrator': `Analyzing your request: "${trimmed}"

I'll route this to the appropriate specialized agent based on the task complexity and domain.

Task Classification:
- Complexity: moderate
- Domain: general
- Recommended Agent: ${trimmed.includes('code') ? 'Codebase' : trimmed.includes('deploy') ? 'DevOps' : 'GitHub'} Agent

Would you like me to proceed with this routing?`,
        'github': `GitHub Agent processing: "${trimmed}"

Available GitHub operations:
- repo list/create/delete
- issue list/create/close
- pr list/create/merge
- workflow run/status

Processing your request...`,
        'codebase': `Codebase Agent analyzing: "${trimmed}"

I can help you with:
- Search code patterns (grep-style)
- Analyze file structure
- Find dependencies
- Review code quality

Scanning codebase...`,
        'devops': `DevOps Agent processing: "${trimmed}"

Available operations:
- Deploy to staging/production
- Run CI/CD pipelines
- Check deployment status
- Manage environment variables

Checking current deployment state...`
      }

      useAgentsStore.setState(state => {
        const session = state.sessions[activeSessionId]
        if (session) {
          const lastMsg = session.messages[session.messages.length - 1]
          if (lastMsg && lastMsg.status === 'streaming') {
            lastMsg.content = responses[activeSession?.agentId || 'orchestrator'] || 'Processing your request...'
            lastMsg.status = 'complete'
          }
        }
      })
      setProcessing(false)
    }, 800)
  }, [input, activeSessionId, activeSession, isProcessing, addMessage, clearSession, setProcessing, createSession])

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-lg overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <AgentIcon className="w-5 h-5 text-[#a855f7]" />
          <span className="text-sm font-semibold text-[#e0e0e0]">AI Agents CLI</span>
          <span className="text-xs text-[#505050] bg-[#1a1a1a] px-2 py-0.5 rounded">multi-agent</span>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-[#606060]">
          <span>{sessionList.length} session{sessionList.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Agent Sidebar */}
        <div className="w-48 bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col">
          <div className="px-3 py-2 text-xs text-[#505050] uppercase tracking-wider border-b border-[#1a1a1a]">
            Agents
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {AVAILABLE_AGENTS.map(agent => {
              const isConnected = sessionList.some(s => s.agentId === agent.id)
              return (
                <button
                  key={agent.id}
                  onClick={() => {
                    const existing = sessionList.find(s => s.agentId === agent.id)
                    if (existing) {
                      setActiveSession(existing.id)
                    } else {
                      createSession(agent.id, agent.name)
                    }
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                    activeSession?.agentId === agent.id
                      ? 'bg-[#1a1a1a] text-[#e0e0e0]'
                      : 'text-[#707070] hover:text-[#a0a0a0] hover:bg-[#141414]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#a855f7]' : 'bg-[#404040]'}`} />
                    <span>{agent.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
          
          <div className="p-2 border-t border-[#1a1a1a]">
            <div className="text-[10px] text-[#404040] space-y-0.5">
              <p>Type &quot;agents&quot; for list</p>
              <p>Type &quot;connect &lt;id&gt;&quot;</p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-2 py-1 bg-[#0d0d0d] border-b border-[#1a1a1a] overflow-x-auto">
            {sessionList.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs transition-colors shrink-0 group ${
                  session.isActive
                    ? 'bg-[#1a1a1a] text-[#e0e0e0]'
                    : 'text-[#606060] hover:text-[#909090] hover:bg-[#141414]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${session.isActive ? 'bg-[#a855f7]' : 'bg-[#404040]'}`} />
                <span>{session.agentName}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeSession(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-[#ef4444] ml-1"
                >
                  x
                </button>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div ref={outputRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSession?.messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-[#a855f7] text-sm">
                <span className="animate-pulse">Processing...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center border-t border-[#1a1a1a] bg-[#0d0d0d]">
            <span className="pl-3 pr-1 text-[#a855f7] font-mono text-sm select-none">
              {activeSession?.agentName || 'agent'}
            </span>
            <span className="text-[#505050] font-mono text-sm select-none">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
              className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-[#e0e0e0] font-mono text-sm placeholder:text-[#404040] disabled:opacity-50"
              placeholder="Enter command or ask a question..."
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#0d0d0d] border-t border-[#1a1a1a] text-xs">
        <div className="flex items-center gap-4 text-[#505050]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
            {activeSession?.agentName || 'No agent'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[#404040]">
          <span>help: commands</span>
          <span>agents: list</span>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
        isUser 
          ? 'bg-[#1a1a1a] text-[#e0e0e0]' 
          : isSystem
            ? 'bg-[#0d0d0d] border border-[#1a1a1a] text-[#707070]'
            : 'bg-[#1a0d1f] border border-[#2d1a3d] text-[#c0c0c0]'
      }`}>
        {!isUser && !isSystem && (
          <div className="text-[10px] text-[#a855f7] mb-1">{message.agentName}</div>
        )}
        <pre className={`whitespace-pre-wrap text-sm font-mono ${message.status === 'streaming' ? 'animate-pulse' : ''}`}>
          {message.content}
        </pre>
      </div>
    </div>
  )
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="5" />
      <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2" />
      <circle cx="12" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}
