// Organization Commands
import type { CommandDefinition, CommandResult, ParsedCommand, CommandContext } from '../types'
import { GitHubService } from '../github-service'

export const orgCommands: CommandDefinition = {
  name: 'org',
  description: 'Manage organizations',
  usage: 'gh org <subcommand> [flags]',
  subcommands: [
    { name: 'list', description: 'List organizations', usage: 'gh org list', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'view', description: 'View organization details', usage: 'gh org view <org>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'repos', description: 'List organization repos', usage: 'gh org repos <org> [flags]', handler: async () => ({ success: true, outputs: [] }) }
  ],
  flags: [
    { name: 'limit', shorthand: 'L', description: 'Maximum number of items to fetch', type: 'number', default: 30 },
    { name: 'type', shorthand: 't', description: 'Filter repos by type: all, public, private, forks, sources', type: 'string' }
  ],
  examples: [
    'gh org list',
    'gh org view my-organization',
    'gh org repos my-organization',
    'gh org repos my-organization --type=public --limit=20'
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
      case 'repos':
        return handleRepos(args, context, github)
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
    const orgs = await github.listOrgs()

    if (orgs.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: 'You are not a member of any organizations.'
        }]
      }
    }

    const table = orgs.map(org => {
      const name = org.name || org.login
      const description = org.description?.slice(0, 40) || ''
      return `${org.login.padEnd(25)} ${name.padEnd(30)} ${description}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'LOGIN'.padEnd(25)} ${'NAME'.padEnd(30)} DESCRIPTION\n${table}`,
        metadata: { orgs }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list organizations: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleView(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const orgName = args.args[0]
    
    if (!orgName) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Organization name required. Usage: gh org view <org>'
        }]
      }
    }

    const org = await github.getOrg(orgName)

    const content = `
${org.name || org.login}
${'='.repeat(Math.min((org.name || org.login).length, 60))}

Login: ${org.login}
${org.description ? `Description: ${org.description}` : ''}

${org.membersCount !== undefined ? `Members: ${org.membersCount}` : ''}
${org.reposCount !== undefined ? `Repositories: ${org.reposCount}` : ''}

View on GitHub: ${org.htmlUrl}
`

    return {
      success: true,
      outputs: [{
        type: 'info',
        content,
        metadata: { org }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to view organization: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleRepos(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const orgName = args.args[0]
    
    if (!orgName) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Organization name required. Usage: gh org repos <org>'
        }]
      }
    }

    const type = args.flags.type as 'all' | 'public' | 'private' | 'forks' | 'sources' | 'member' | undefined
    const limit = (args.flags.limit as number) || (args.flags.L as number) || 30

    const repos = await github.listOrgRepos(orgName, {
      type: type || 'all',
      per_page: Math.min(limit, 100)
    })

    if (repos.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: `No repositories found in ${orgName}`
        }]
      }
    }

    const table = repos.map(repo => {
      const visibility = repo.private ? 'private' : 'public'
      const updated = new Date(repo.updatedAt).toLocaleDateString()
      return `${repo.name.padEnd(35)} ${visibility.padEnd(8)} ${(repo.language || '').padEnd(12)} ${updated}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'REPOSITORY'.padEnd(35)} ${'VIS'.padEnd(8)} ${'LANGUAGE'.padEnd(12)} UPDATED\n${table}`,
        metadata: { repos }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list organization repos: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}
