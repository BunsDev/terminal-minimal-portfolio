import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Agents CLI | OpenClaw',
  description: 'Multi-agent AI system with specialized agents for GitHub operations, codebase analysis, and DevOps workflows.'
}

export default function AgentsCLILayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
