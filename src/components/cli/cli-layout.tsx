'use client'

import { useEffect, useCallback } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCLIStore } from '@/lib/cli/store'
import { PaneTree } from './pane-tree'
import { TerminalPane } from './terminal-pane'
import { AuthPrompt } from './auth-prompt'
import { GitHubService } from '@/lib/cli/github-service'

interface CLILayoutProps {
  accessToken?: string
}

export function CLILayout({ accessToken: propToken }: CLILayoutProps) {
  const { data: session, status } = useSession()
  const { 
    panes, 
    activePaneId, 
    setUser, 
    setToken,
    user,
    splitPane,
    createPane,
    closePane,
    setActivePane
  } = useCLIStore()

  // Sync session with store
  useEffect(() => {
    if (session?.user && status === 'authenticated') {
      // Fetch full user data
      const token = propToken || (session as { accessToken?: string }).accessToken
      if (token) {
        setToken(token)
        const github = new GitHubService(token)
        github.getCurrentUser().then(setUser).catch(console.error)
      }
    } else if (status === 'unauthenticated') {
      setUser(null)
      setToken(null)
    }
  }, [session, status, setUser, setToken, propToken])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Shift combinations
    if (e.ctrlKey && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault()
          createPane({})
          break
        case 'h':
          e.preventDefault()
          if (activePaneId) splitPane(activePaneId, 'horizontal')
          break
        case 'v':
          e.preventDefault()
          if (activePaneId) splitPane(activePaneId, 'vertical')
          break
      }
    }
    
    // Ctrl+W to close pane
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault()
      if (activePaneId && Object.keys(panes).length > 1) {
        closePane(activePaneId)
      }
    }

    // Ctrl+Tab to cycle panes
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault()
      const paneIds = Object.keys(panes)
      const currentIndex = paneIds.indexOf(activePaneId || '')
      const nextIndex = e.shiftKey 
        ? (currentIndex - 1 + paneIds.length) % paneIds.length
        : (currentIndex + 1) % paneIds.length
      setActivePane(paneIds[nextIndex])
    }

    // Alt+1-9 to switch to specific pane
    if (e.altKey && /^[1-9]$/.test(e.key)) {
      e.preventDefault()
      const paneIds = Object.keys(panes)
      const index = parseInt(e.key) - 1
      if (index < paneIds.length) {
        setActivePane(paneIds[index])
      }
    }
  }, [activePaneId, panes, createPane, splitPane, closePane, setActivePane])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const paneList = Object.values(panes)

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-lg overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <GitHubIcon className="w-5 h-5 text-[#808080]" />
          <span className="text-sm font-semibold text-[#e0e0e0]">GitHub Cloud CLI</span>
          <span className="text-xs text-[#505050] bg-[#1a1a1a] px-2 py-0.5 rounded">beta</span>
        </div>
        
        <div className="flex items-center gap-3">
          {status === 'loading' ? (
            <span className="text-xs text-[#606060]">Loading...</span>
          ) : user ? (
            <div className="flex items-center gap-2">
              <img 
                src={user.avatarUrl} 
                alt={user.login}
                className="w-6 h-6 rounded-full border border-[#2a2a2a]"
              />
              <span className="text-sm text-[#a0a0a0]">{user.login}</span>
              <button
                onClick={() => signOut()}
                className="text-xs text-[#606060] hover:text-[#ef4444] transition-colors ml-2"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('github')}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] rounded text-sm text-[#e0e0e0] transition-colors"
            >
              <GitHubIcon className="w-4 h-4" />
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <PaneTree />

        {/* Pane Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-2 py-1 bg-[#0d0d0d] border-b border-[#1a1a1a] overflow-x-auto">
            {paneList.map((pane, index) => (
              <button
                key={pane.id}
                onClick={() => setActivePane(pane.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs transition-colors shrink-0 ${
                  pane.isActive
                    ? 'bg-[#1a1a1a] text-[#e0e0e0]'
                    : 'text-[#606060] hover:text-[#909090] hover:bg-[#141414]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${pane.isActive ? 'bg-[#4ade80]' : 'bg-[#404040]'}`} />
                <span>{pane.title}</span>
                <kbd className="text-[10px] text-[#404040] ml-1">Alt+{index + 1}</kbd>
              </button>
            ))}
          </div>

          {/* Active Pane */}
          <div className="flex-1 overflow-hidden">
            {activePaneId && <TerminalPane paneId={activePaneId} />}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#0d0d0d] border-t border-[#1a1a1a] text-xs">
        <div className="flex items-center gap-4 text-[#505050]">
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-[#4ade80]' : 'bg-[#ef4444]'}`} />
            {user ? 'Connected' : 'Not authenticated'}
          </span>
          <span>{paneList.length} pane{paneList.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3 text-[#404040]">
          <span>Ctrl+Shift+N: New</span>
          <span>Ctrl+Tab: Switch</span>
          <span>Ctrl+W: Close</span>
        </div>
      </div>
    </div>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}
