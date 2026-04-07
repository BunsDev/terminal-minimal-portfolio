// Release Commands
import type { CommandDefinition, CommandResult, ParsedCommand, CommandContext } from '../types'
import { GitHubService } from '../github-service'
import { parseRepoArg, parseNumberArg } from '../command-parser'

export const releaseCommands: CommandDefinition = {
  name: 'release',
  description: 'Manage releases',
  usage: 'gh release <subcommand> [flags]',
  subcommands: [
    { name: 'list', description: 'List releases', usage: 'gh release list <repo>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'view', description: 'View a release', usage: 'gh release view <repo> <tag>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'create', description: 'Create a release', usage: 'gh release create <repo> <tag> [flags]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'delete', description: 'Delete a release', usage: 'gh release delete <repo> <tag>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'latest', description: 'View latest release', usage: 'gh release latest <repo>', handler: async () => ({ success: true, outputs: [] }) }
  ],
  flags: [
    { name: 'limit', shorthand: 'L', description: 'Maximum number of items to fetch', type: 'number', default: 30 },
    { name: 'title', shorthand: 't', description: 'Release title', type: 'string' },
    { name: 'notes', shorthand: 'n', description: 'Release notes', type: 'string' },
    { name: 'draft', shorthand: 'd', description: 'Create as draft', type: 'boolean' },
    { name: 'prerelease', shorthand: 'p', description: 'Mark as prerelease', type: 'boolean' },
    { name: 'target', description: 'Target commitish', type: 'string' }
  ],
  examples: [
    'gh release list owner/repo',
    'gh release view owner/repo v1.0.0',
    'gh release latest owner/repo',
    'gh release create owner/repo v1.0.0 --title="Version 1.0" --notes="First release"',
    'gh release delete owner/repo v1.0.0'
  ],
  handler: async (args, context) => {
    const subcommand = args.subcommand || 'list'

    if (!context.token) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Authentication required. Please sign in with GitHub.'
        }]
      }
    }

    const github = new GitHubService(context.token)

    switch (subcommand) {
      case 'list':
        return handleList(args, context, github)
      case 'view':
        return handleView(args, context, github)
      case 'create':
        return handleCreate(args, context, github)
      case 'delete':
        return handleDelete(args, context, github)
      case 'latest':
        return handleLatest(args, context, github)
      default:
        return {
          success: false,
          outputs: [{
            type: 'error',
            content: `Unknown subcommand: ${subcommand}`
          }]
        }
    }
  }
}

async function handleList(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh release list owner/repo'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const limit = (args.flags.limit as number) || (args.flags.L as number) || 30

    const releases = await github.listReleases(parsed.owner, parsed.repo, {
      per_page: Math.min(limit, 100)
    })

    if (releases.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: `No releases found in ${repoArg}`
        }]
      }
    }

    const table = releases.map(release => {
      let status = ''
      if (release.draft) status = 'DRAFT'
      else if (release.prerelease) status = 'PRE'
      else status = 'STABLE'
      
      const name = release.name || release.tagName
      const displayName = name.slice(0, 30) + (name.length > 30 ? '...' : '')
      const date = release.publishedAt 
        ? new Date(release.publishedAt).toLocaleDateString()
        : 'Not published'
      
      return `${release.tagName.padEnd(20)} ${status.padEnd(7)} ${displayName.padEnd(32)} ${release.author.login.padEnd(15)} ${date}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'TAG'.padEnd(20)} ${'TYPE'.padEnd(7)} ${'TITLE'.padEnd(32)} ${'AUTHOR'.padEnd(15)} PUBLISHED\n${table}`,
        metadata: { releases }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list releases: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleView(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const tagArg = args.args[1]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh release view owner/repo v1.0.0'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    // If tag is provided, search for it; otherwise get latest
    let release
    if (tagArg) {
      const releases = await github.listReleases(parsed.owner, parsed.repo, { per_page: 100 })
      release = releases.find(r => r.tagName === tagArg)
      if (!release) {
        return {
          success: false,
          outputs: [{
            type: 'error',
            content: `Release ${tagArg} not found`
          }]
        }
      }
    } else {
      release = await github.getLatestRelease(parsed.owner, parsed.repo)
    }

    let status = 'Stable'
    if (release.draft) status = 'Draft'
    else if (release.prerelease) status = 'Pre-release'

    const assets = release.assets.length > 0
      ? release.assets.map(a => `  - ${a.name} (${formatBytes(a.size)}, ${a.downloadCount} downloads)`).join('\n')
      : '  No assets'

    const content = `
${release.name || release.tagName}
${'='.repeat(Math.min((release.name || release.tagName).length, 60))}

Tag: ${release.tagName}
Type: ${status}
Author: ${release.author.login}

Created: ${new Date(release.createdAt).toLocaleString()}
${release.publishedAt ? `Published: ${new Date(release.publishedAt).toLocaleString()}` : 'Not published'}

${release.body || 'No release notes.'}

Assets:
${assets}

Download:
  Tarball: ${release.tarballUrl}
  Zip: ${release.zipballUrl}

View on GitHub: ${release.htmlUrl}
`

    return {
      success: true,
      outputs: [{
        type: 'info',
        content,
        metadata: { release }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to view release: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleCreate(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const tagArg = args.args[1]
    
    if (!repoArg || !tagArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and tag required. Usage: gh release create owner/repo v1.0.0'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const title = (args.flags.title as string) || (args.flags.t as string)
    const notes = (args.flags.notes as string) || (args.flags.n as string)
    const draft = args.flags.draft === true || args.flags.d === true
    const prerelease = args.flags.prerelease === true || args.flags.p === true
    const target = args.flags.target as string | undefined

    const release = await github.createRelease(parsed.owner, parsed.repo, {
      tag_name: tagArg,
      name: title,
      body: notes,
      draft,
      prerelease,
      target_commitish: target
    })

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Created release ${release.tagName}

View at: ${release.htmlUrl}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to create release: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleDelete(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const tagArg = args.args[1]
    
    if (!repoArg || !tagArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and tag required. Usage: gh release delete owner/repo v1.0.0'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const confirm = args.flags.yes === true || args.flags.y === true
    if (!confirm) {
      return {
        success: false,
        outputs: [{
          type: 'warning',
          content: `This will permanently delete release ${tagArg}.
Add --yes flag to confirm deletion.`
        }]
      }
    }

    // Find the release by tag
    const releases = await github.listReleases(parsed.owner, parsed.repo, { per_page: 100 })
    const release = releases.find(r => r.tagName === tagArg)
    
    if (!release) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: `Release ${tagArg} not found`
        }]
      }
    }

    await github.deleteRelease(parsed.owner, parsed.repo, release.id)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Deleted release ${tagArg}`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to delete release: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleLatest(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  // Reuse view with no tag argument to get latest
  const newArgs: ParsedCommand = {
    ...args,
    args: [args.args[0]] // Only pass repo, no tag
  }
  return handleView(newArgs, context, github)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
