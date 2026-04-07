import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sandbox CLI | OpenClaw',
  description: 'Vercel Sandbox terminal for isolated code execution with full Linux environment access.'
}

export default function SandboxCLILayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
