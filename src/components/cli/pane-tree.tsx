'use client'

import { useCLIStore } from '@/lib/cli/store'
import type { Pane, PaneTreeNode } from '@/lib/cli/types'

interface PaneTreeProps {
  collapsed?: boolean
}

export function PaneTree({ collapsed = false }: PaneTreeProps) {
  const { panes, activePaneId, setActivePane, closePane, splitPane, createPane, sidebarCollapsed, toggleSidebar } = useCLIStore()
  
  const paneList = Object.values(panes)

  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col items-center py-2 border-r border-[#2a2a2a] bg-[#0d0d0d]">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-[#1a1a1a] rounded transition-colors"
          title="Expand sidebar"
        >
          <ChevronRightIcon className="w-4 h-4 text-[#606060]" />
        </button>
        <div className="flex-1 flex flex-col items-center gap-1 mt-2">
          {paneList.map((pane, index) => (
            <button
              key={pane.id}
              onClick={() => setActivePane(pane.id)}
              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-mono transition-colors ${
                pane.isActive 
                  ? 'bg-[#2d5a27] text-[#4ade80]' 
                  : 'hover:bg-[#1a1a1a] text-[#606060]'
              }`}
              title={pane.title}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => createPane({})}
          className="p-2 hover:bg-[#1a1a1a] rounded transition-colors mt-2"
          title="New pane"
        >
          <PlusIcon className="w-4 h-4 text-[#606060]" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-56 flex flex-col border-r border-[#2a2a2a] bg-[#0d0d0d] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a]">
        <span className="text-xs font-semibold text-[#808080] uppercase tracking-wider">Panes</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => createPane({})}
            className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
            title="New pane (Ctrl+Shift+N)"
          >
            <PlusIcon className="w-3.5 h-3.5 text-[#606060]" />
          </button>
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5 text-[#606060]" />
          </button>
        </div>
      </div>

      {/* Pane List */}
      <div className="flex-1 overflow-y-auto py-1">
        {paneList.map((pane, index) => (
          <PaneItem
            key={pane.id}
            pane={pane}
            index={index}
            isActive={pane.id === activePaneId}
            onSelect={() => setActivePane(pane.id)}
            onClose={() => closePane(pane.id)}
            onSplitH={() => splitPane(pane.id, 'horizontal')}
            onSplitV={() => splitPane(pane.id, 'vertical')}
            canClose={paneList.length > 1}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[#2a2a2a]">
        <div className="text-xs text-[#505050] space-y-0.5">
          <div className="flex justify-between">
            <span>Split H</span>
            <kbd className="px-1 bg-[#1a1a1a] rounded text-[#606060]">Ctrl+Shift+H</kbd>
          </div>
          <div className="flex justify-between">
            <span>Split V</span>
            <kbd className="px-1 bg-[#1a1a1a] rounded text-[#606060]">Ctrl+Shift+V</kbd>
          </div>
          <div className="flex justify-between">
            <span>Close</span>
            <kbd className="px-1 bg-[#1a1a1a] rounded text-[#606060]">Ctrl+W</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PaneItemProps {
  pane: Pane
  index: number
  isActive: boolean
  onSelect: () => void
  onClose: () => void
  onSplitH: () => void
  onSplitV: () => void
  canClose: boolean
}

function PaneItem({ pane, index, isActive, onSelect, onClose, onSplitH, onSplitV, canClose }: PaneItemProps) {
  return (
    <div
      className={`group mx-1 rounded transition-colors ${
        isActive ? 'bg-[#1a1a1a]' : 'hover:bg-[#141414]'
      }`}
    >
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
      >
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#4ade80]' : 'bg-[#404040]'}`} />
        <span className={`flex-1 text-sm truncate ${isActive ? 'text-[#e0e0e0]' : 'text-[#808080]'}`}>
          {pane.title}
        </span>
        <span className="text-xs text-[#505050] font-mono">{index + 1}</span>
      </button>
      
      {/* Actions */}
      <div className={`flex items-center gap-0.5 px-2 pb-1.5 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        <button
          onClick={(e) => { e.stopPropagation(); onSplitH(); }}
          className="p-1 hover:bg-[#2a2a2a] rounded text-[#606060] hover:text-[#909090]"
          title="Split horizontal"
        >
          <SplitHIcon className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSplitV(); }}
          className="p-1 hover:bg-[#2a2a2a] rounded text-[#606060] hover:text-[#909090]"
          title="Split vertical"
        >
          <SplitVIcon className="w-3 h-3" />
        </button>
        {canClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 hover:bg-[#2a2a2a] rounded text-[#606060] hover:text-[#ef4444] ml-auto"
            title="Close pane"
          >
            <XIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function SplitHIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 3v18" />
    </svg>
  )
}

function SplitVIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
