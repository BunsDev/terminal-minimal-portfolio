'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useSandboxStore } from '@/lib/cli/sandbox-store'

export function SandboxCLILayout() {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  
  const {
    sandboxes,
    activeSandboxId,
    commandHistory,
    isExecuting,
    createSandbox,
    deleteSandbox,
    setActiveSandbox,
    addCommand,
    updateCommandOutput,
    clearHistory,
    setExecuting
  } = useSandboxStore()

  const activeSandbox = activeSandboxId ? sandboxes[activeSandboxId] : null
  const history = activeSandboxId ? (commandHistory[activeSandboxId] || []) : []
  const sandboxList = Object.values(sandboxes)

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [history])

  // Create default sandbox on mount
  useEffect(() => {
    if (sandboxList.length === 0) {
      createSandbox('default-sandbox')
    }
  }, [sandboxList.length, createSandbox])

  const simulateCommand = useCallback((cmd: string, commandId: string, sandboxId: string) => {
    const startTime = Date.now()
    
    // Simulate command execution
    setTimeout(() => {
      let output = ''
      let status: 'completed' | 'error' = 'completed'

      const parts = cmd.trim().split(' ')
      const command = parts[0]

      switch (command) {
        case 'help':
          output = `Vercel Sandbox CLI - Available Commands

System Commands:
  help              Show this help message
  clear             Clear terminal history
  sandbox           List all sandboxes
  sandbox create    Create a new sandbox
  sandbox delete    Delete a sandbox
  status            Show sandbox status
  env               Show environment variables

File Operations:
  ls [path]         List directory contents
  cat <file>        Display file contents
  pwd               Print working directory
  mkdir <dir>       Create directory
  touch <file>      Create empty file

Process Commands:
  ps                List running processes
  top               Show resource usage
  kill <pid>        Kill a process

Network:
  curl <url>        Make HTTP request
  ping <host>       Check connectivity

Type a command to execute it in the sandbox.`
          break

        case 'status':
          output = `Sandbox Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID:       ${activeSandbox?.id || 'N/A'}
Name:     ${activeSandbox?.name || 'N/A'}
Status:   ${activeSandbox?.status || 'N/A'}
CPU:      ${activeSandbox?.resources.cpu || 'N/A'}
Memory:   ${activeSandbox?.resources.memory || 'N/A'}
Storage:  ${activeSandbox?.resources.storage || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
          break

        case 'env':
          output = Object.entries(activeSandbox?.environment || {})
            .map(([key, value]) => `${key}=${value}`)
            .join('\n') || 'No environment variables set'
          break

        case 'ls':
          output = `total 8
drwxr-xr-x  3 user user 4096 Apr  7 12:00 .
drwxr-xr-x  5 user user 4096 Apr  7 12:00 ..
drwxr-xr-x  2 user user 4096 Apr  7 12:00 src
-rw-r--r--  1 user user  512 Apr  7 12:00 package.json
-rw-r--r--  1 user user 1024 Apr  7 12:00 README.md
drwxr-xr-x  2 user user 4096 Apr  7 12:00 node_modules`
          break

        case 'pwd':
          output = '/vercel/share/v0-project'
          break

        case 'ps':
          output = `  PID TTY          TIME CMD
    1 pts/0    00:00:00 bash
   42 pts/0    00:00:01 node
   89 pts/0    00:00:00 ps`
          break

        case 'top':
          output = `Sandbox Resource Monitor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CPU Usage:    23% [████░░░░░░]
Memory:       1.2GB / 4GB
Disk I/O:     120 KB/s
Network:      45 KB/s in, 12 KB/s out
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Processes: 3 running, 0 sleeping`
          break

        case 'sandbox':
          if (parts[1] === 'create') {
            const name = parts[2] || `sandbox-${Date.now()}`
            createSandbox(name)
            output = `Created sandbox: ${name}`
          } else if (parts[1] === 'delete' && parts[2]) {
            const target = sandboxList.find(s => s.name === parts[2] || s.id === parts[2])
            if (target) {
              deleteSandbox(target.id)
              output = `Deleted sandbox: ${target.name}`
            } else {
              output = `Sandbox not found: ${parts[2]}`
              status = 'error'
            }
          } else {
            output = `Active Sandboxes:
${sandboxList.map(s => `  ${s.name.padEnd(20)} [${s.status}]`).join('\n')}`
          }
          break

        case 'cat':
          if (!parts[1]) {
            output = 'cat: missing file operand'
            status = 'error'
          } else if (parts[1] === 'package.json') {
            output = `{
  "name": "v0-project",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}`
          } else {
            output = `cat: ${parts[1]}: No such file or directory`
            status = 'error'
          }
          break

        case 'echo':
          output = parts.slice(1).join(' ')
          break

        case 'date':
          output = new Date().toString()
          break

        case 'whoami':
          output = 'sandbox-user'
          break

        case 'uname':
          output = parts[1] === '-a' 
            ? 'Linux vercel-sandbox 5.15.0-1 #1 SMP x86_64 GNU/Linux'
            : 'Linux'
          break

        case 'curl':
          if (!parts[1]) {
            output = 'curl: try \'curl --help\' for more information'
            status = 'error'
          } else {
            output = `Fetching ${parts[1]}...
HTTP/2 200 OK
content-type: text/html
<html>Response simulated</html>`
          }
          break

        default:
          output = `bash: ${command}: command not found\nType 'help' for available commands`
          status = 'error'
      }

      const duration = Date.now() - startTime
      updateCommandOutput(sandboxId, commandId, output, status, duration)
      setExecuting(false)
    }, 300 + Math.random() * 200)
  }, [activeSandbox, sandboxList, createSandbox, deleteSandbox, updateCommandOutput, setExecuting])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || !activeSandboxId || isExecuting) return

    setInput('')

    if (trimmed === 'clear') {
      clearHistory(activeSandboxId)
      return
    }

    const commandId = addCommand(activeSandboxId, trimmed)
    setExecuting(true)
    simulateCommand(trimmed, commandId, activeSandboxId)
  }, [input, activeSandboxId, isExecuting, addCommand, clearHistory, simulateCommand, setExecuting])

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-lg overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <SandboxIcon className="w-5 h-5 text-[#22c55e]" />
          <span className="text-sm font-semibold text-[#e0e0e0]">Vercel Sandbox</span>
          <span className="text-xs text-[#505050] bg-[#1a1a1a] px-2 py-0.5 rounded">isolated</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${
            activeSandbox?.status === 'running' ? 'text-[#22c55e]' : 'text-[#f59e0b]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              activeSandbox?.status === 'running' ? 'bg-[#22c55e]' : 'bg-[#f59e0b] animate-pulse'
            }`} />
            {activeSandbox?.status || 'no sandbox'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sandbox Sidebar */}
        <div className="w-48 bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col">
          <div className="px-3 py-2 text-xs text-[#505050] uppercase tracking-wider border-b border-[#1a1a1a] flex items-center justify-between">
            <span>Instances</span>
            <button 
              onClick={() => createSandbox(`sandbox-${Date.now()}`)}
              className="text-[#22c55e] hover:text-[#4ade80]"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sandboxList.map(sandbox => (
              <button
                key={sandbox.id}
                onClick={() => setActiveSandbox(sandbox.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  activeSandboxId === sandbox.id
                    ? 'bg-[#1a1a1a] text-[#e0e0e0]'
                    : 'text-[#707070] hover:text-[#a0a0a0] hover:bg-[#141414]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    sandbox.status === 'running' ? 'bg-[#22c55e]' : 
                    sandbox.status === 'starting' ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#ef4444]'
                  }`} />
                  <span className="truncate">{sandbox.name}</span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="p-2 border-t border-[#1a1a1a]">
            <div className="text-[10px] text-[#404040] space-y-0.5">
              <p>CPU: {activeSandbox?.resources.cpu || '-'}</p>
              <p>RAM: {activeSandbox?.resources.memory || '-'}</p>
            </div>
          </div>
        </div>

        {/* Terminal Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Output */}
          <div ref={outputRef} className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-2">
            {history.length === 0 && (
              <div className="text-[#505050]">
                <p>Vercel Sandbox Terminal - Type &quot;help&quot; for commands</p>
                <p className="text-[#404040] mt-1">Isolated environment for secure code execution.</p>
              </div>
            )}
            
            {history.map(entry => (
              <div key={entry.id} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-[#22c55e] select-none">$</span>
                  <span className="text-[#e0e0e0]">{entry.command}</span>
                  {entry.status === 'running' && (
                    <span className="text-[#f59e0b] animate-pulse ml-auto text-xs">running...</span>
                  )}
                  {entry.duration !== undefined && (
                    <span className="text-[#505050] ml-auto text-xs">{entry.duration}ms</span>
                  )}
                </div>
                {entry.output && (
                  <pre className={`whitespace-pre-wrap break-words pl-4 ${
                    entry.status === 'error' ? 'text-[#ef4444]' : 'text-[#a0a0a0]'
                  }`}>
                    {entry.output}
                  </pre>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center border-t border-[#1a1a1a] bg-[#0d0d0d]">
            <span className="pl-3 pr-1 text-[#22c55e] font-mono text-sm select-none">
              {activeSandbox?.name || 'sandbox'}
            </span>
            <span className="text-[#505050] font-mono text-sm select-none">:</span>
            <span className="text-[#60a5fa] font-mono text-sm select-none px-1">~</span>
            <span className="text-[#505050] font-mono text-sm select-none">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isExecuting || activeSandbox?.status !== 'running'}
              className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-[#e0e0e0] font-mono text-sm placeholder:text-[#404040] disabled:opacity-50"
              placeholder={activeSandbox?.status === 'running' ? 'Type a command...' : 'Waiting for sandbox...'}
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#0d0d0d] border-t border-[#1a1a1a] text-xs">
        <div className="flex items-center gap-4 text-[#505050]">
          <span>{sandboxList.length} sandbox{sandboxList.length !== 1 ? 'es' : ''}</span>
          <span>{history.length} command{history.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3 text-[#404040]">
          <span>help: commands</span>
          <span>clear: reset</span>
        </div>
      </div>
    </div>
  )
}

function SandboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <circle cx="7" cy="6" r="1" fill="currentColor" />
      <circle cx="10" cy="6" r="1" fill="currentColor" />
    </svg>
  )
}
