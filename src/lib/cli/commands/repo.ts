// Repository Commands
import type { CommandDefinition, CommandResult, ParsedCommand, CommandContext } from '../types'
import { GitHubService } from '../github-service'
import { parseRepoArg } from '../command-parser'

export const repoCommands: CommandDefinition = {
  name: 'repo',
  description: 'Manage repositories',
  usage: 'gh repo <subcommand> [flags]',
  subcommands: [
    { name: 'list', description: 'List repositories', usage: 'gh repo list [flags]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'view', description: 'View a repository', usage: 'gh repo view [repo]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'create', description: 'Create a repository', usage: 'gh repo create <name> [flags]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'clone', description: 'Get clone URLs', usage: 'gh repo clone <repo>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'fork', description: 'Fork a repository', usage: 'gh repo fork <repo>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'delete', description: 'Delete a repository', usage: 'gh repo delete <repo>', handler: async () => ({ success: true, outputs: [] }) }
  ],
  flags: [
    { name: 'visibility', shorthand: 'v', description: 'Filter by visibility: all, public, private', type: 'string' },
    { name: 'limit', shorthand: 'L', description: 'Maximum number of items to fetch', type: 'number', default: 30 },
    { name: 'sort', shorthand: 's', description: 'Sort by: created, updated, pushed, name', type: 'string' },
    { name: 'private', shorthand: 'p', description: 'Make repository private', type: 'boolean' },
    { name: 'public', description: 'Make repository public', type: 'boolean' }
  ],
  examples: [
    'gh repo list',
    'gh repo list --visibility=private --limit=10',
    'gh repo view owner/repo',
    'gh repo create my-new-repo --private',
    'gh repo fork owner/repo',
    'gh repo clone owner/repo'
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
      case 'clone':
        return handleClone(args, context, github)
      case 'fork':
        return handleFork(args, context, github)
      case 'delete':
        return handleDelete(args, context, github)
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
    const visibility = args.flags.visibility as 'all' | 'public' | 'private' | undefined
    const limit = (args.flags.limit as number) || (args.flags.L as number) || 30
    const sort = args.flags.sort as 'created' | 'updated' | 'pushed' | 'full_name' | undefined

    const repos = await github.listRepos({
      visibility: visibility || 'all',
      per_page: Math.min(limit, 100),
      sort: sort || 'updated'
    })

    if (repos.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: 'No repositories found.'
        }]
      }
    }

    const table = repos.map(repo => {
      const visibility = repo.private ? 'private' : 'public'
      const description = repo.description ? repo.description.slice(0, 50) + (repo.description.length > 50 ? '...' : '') : ''
      const updated = new Date(repo.updatedAt).toLocaleDateString()
      return `${repo.fullName.padEnd(40)} ${visibility.padEnd(8)} ${repo.language?.padEnd(12) || ''.padEnd(12)} ${updated}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'REPOSITORY'.padEnd(40)} ${'VIS'.padEnd(8)} ${'LANGUAGE'.padEnd(12)} UPDATED\n${table}`,
        metadata: { repos }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleView(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh repo view owner/repo'
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

    const repo = await github.getRepo(parsed.owner, parsed.repo)

    const content = `
${repo.fullName}
${'='.repeat(repo.fullName.length)}

${repo.description || 'No description'}

${repo.private ? '[Private]' : '[Public]'} ${repo.fork ? '[Fork]' : ''} ${repo.language ? `[${repo.language}]` : ''}

Stars: ${repo.stargazersCount}   Forks: ${repo.forksCount}   Issues: ${repo.openIssuesCount}

Default Branch: ${repo.defaultBranch}
Created: ${new Date(repo.createdAt).toLocaleDateString()}
Updated: ${new Date(repo.updatedAt).toLocaleDateString()}

Clone URLs:
  HTTPS: ${repo.cloneUrl}
  SSH:   ${repo.sshUrl}

View on GitHub: ${repo.htmlUrl}
`

    return {
      success: true,
      outputs: [{
        type: 'info',
        content,
        metadata: { repo }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to view repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleCreate(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const name = args.args[0]
    
    if (!name) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository name required. Usage: gh repo create <name> [flags]'
        }]
      }
    }

    const isPrivate = args.flags.private === true || args.flags.p === true
    const description = args.flags.description as string | undefined

    const repo = await github.createRepo({
      name,
      description,
      private: isPrivate,
      auto_init: true
    })

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Created repository ${repo.fullName}

View at: ${repo.htmlUrl}

Clone with:
  git clone ${repo.cloneUrl}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to create repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleClone(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh repo clone owner/repo'
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

    const urls = await github.cloneUrl(parsed.owner, parsed.repo)

    return {
      success: true,
      outputs: [{
        type: 'info',
        content: `Clone URLs for ${repoArg}:

HTTPS: ${urls.https}
SSH:   ${urls.ssh}

Run locally:
  git clone ${urls.https}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to get clone URLs: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleFork(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh repo fork owner/repo'
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

    const fork = await github.forkRepo(parsed.owner, parsed.repo)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Forked ${repoArg} to ${fork.fullName}

View at: ${fork.htmlUrl}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to fork repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleDelete(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh repo delete owner/repo'
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

    // Confirm deletion
    const confirm = args.flags.yes === true || args.flags.y === true
    if (!confirm) {
      return {
        success: false,
        outputs: [{
          type: 'warning',
          content: `This will permanently delete ${repoArg} and all its contents.
Add --yes flag to confirm deletion.`
        }]
      }
    }

    await github.deleteRepo(parsed.owner, parsed.repo)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Deleted repository ${repoArg}`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to delete repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}
