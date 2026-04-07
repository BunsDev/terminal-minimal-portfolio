import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cloud CLI',
  description: 'GitHub Cloud CLI - Manage your repositories, issues, pull requests, workflows, and more from a powerful terminal interface.',
  openGraph: {
    title: 'GitHub Cloud CLI',
    description: 'Manage your GitHub repositories, issues, pull requests, workflows, and more from a powerful terminal interface.',
  }
}

export default function CloudCLILayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
