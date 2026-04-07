// Gist Commands
import type { CommandDefinition, CommandResult, ParsedCommand, CommandContext } from '../types'
import { GitHubService } from '../github-service'

export const gistCommands: CommandDefinition = {
  name: 'gist',
  description: 'Manage GitHub Gists',
  usage: 'gh gist <subcommand> [flags]',
  subcommands: [
    { name: 'list', description: 'List gists', usage: 'gh gist list [flags]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'view', description: 'View a gist', usage: 'gh gist view <id>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'create', description: 'Create a gist', usage: 'gh gist create --filename=<name> --content=<content>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'edit', description: 'Edit a gist', usage: 'gh gist edit <id> [flags]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'delete', description: 'Delete a gist', usage: 'gh gist delete <id>', handler: async () => ({ success: true, outputs: [] }) }
  ],
  flags: [
    { name: 'limit', shorthand: 'L', description: 'Maximum number of items to fetch', type: 'number', default: 30 },
    { name: 'public', shorthand: 'p', description: 'Create public gist', type: 'boolean' },
    { name: 'description', shorthand: 'd', description: 'Gist description', type: 'string' },
    { name: 'filename', shorthand: 'f', description: 'Filename for the gist', type: 'string' },
    { name: 'content', shorthand: 'c', description: 'Content of the gist', type: 'string' }
  ],
  examples: [
    'gh gist list',
    'gh gist view abc123def',
    'gh gist create --filename="hello.js" --content="console.log(\'Hello\')" --public',
    'gh gist delete abc123def'
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
      case 'edit':
        return handleEdit(args, context, github)
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
    const limit = (args.flags.limit as number) || (args.flags.L as number) || 30

    const gists = await github.listGists({
      per_page: Math.min(limit, 100)
    })

    if (gists.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: 'No gists found.'
        }]
      }
    }

    const table = gists.map(gist => {
      const visibility = gist.public ? 'public' : 'secret'
      const files = Object.keys(gist.files).slice(0, 2).join(', ')
      const description = gist.description?.slice(0, 35) || '(no description)'
      const updated = new Date(gist.updatedAt).toLocaleDateString()
      return `${gist.id.padEnd(32)} ${visibility.padEnd(7)} ${files.padEnd(25)} ${description.padEnd(37)} ${updated}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'ID'.padEnd(32)} ${'VIS'.padEnd(7)} ${'FILES'.padEnd(25)} ${'DESCRIPTION'.padEnd(37)} UPDATED\n${table}`,
        metadata: { gists }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list gists: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleView(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const gistId = args.args[0]
    
    if (!gistId) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Gist ID required. Usage: gh gist view <id>'
        }]
      }
    }

    const gist = await github.getGist(gistId)

    const fileList = Object.entries(gist.files).map(([name, file]) => {
      return `  ${name} (${file.language || 'text'}, ${formatBytes(file.size)})`
    }).join('\n')

    let content = `
Gist: ${gist.id}
${'='.repeat(40)}

${gist.description || '(no description)'}

Visibility: ${gist.public ? 'Public' : 'Secret'}
Owner: ${gist.owner.login}
Comments: ${gist.comments}

Created: ${new Date(gist.createdAt).toLocaleString()}
Updated: ${new Date(gist.updatedAt).toLocaleString()}

Files:
${fileList}

View on GitHub: ${gist.htmlUrl}
`

    // Show file content if there's only one file
    const files = Object.entries(gist.files)
    if (files.length === 1 && files[0][1].content) {
      content += `\n--- ${files[0][0]} ---\n${files[0][1].content}\n`
    }

    return {
      success: true,
      outputs: [{
        type: 'info',
        content,
        metadata: { gist }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to view gist: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleCreate(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const filename = (args.flags.filename as string) || (args.flags.f as string)
    const content = (args.flags.content as string) || (args.flags.c as string)
    const description = (args.flags.description as string) || (args.flags.d as string)
    const isPublic = args.flags.public === true || args.flags.p === true

    if (!filename || !content) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Filename and content required. Usage: gh gist create --filename="file.txt" --content="content"'
        }]
      }
    }

    const gist = await github.createGist({
      description,
      public: isPublic,
      files: {
        [filename]: { content }
      }
    })

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Created gist ${gist.id}

View at: ${gist.htmlUrl}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to create gist: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleEdit(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const gistId = args.args[0]
    
    if (!gistId) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Gist ID required. Usage: gh gist edit <id> --description="New description"'
        }]
      }
    }

    const description = (args.flags.description as string) || (args.flags.d as string)
    const filename = (args.flags.filename as string) || (args.flags.f as string)
    const content = (args.flags.content as string) || (args.flags.c as string)

    if (!description && !(filename && content)) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Provide --description or --filename with --content to edit.'
        }]
      }
    }

    const updates: Parameters<typeof github.updateGist>[1] = {}
    if (description) updates.description = description
    if (filename && content) {
      updates.files = { [filename]: { content } }
    }

    const gist = await github.updateGist(gistId, updates)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Updated gist ${gist.id}

View at: ${gist.htmlUrl}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to edit gist: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleDelete(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const gistId = args.args[0]
    
    if (!gistId) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Gist ID required. Usage: gh gist delete <id>'
        }]
      }
    }

    const confirm = args.flags.yes === true || args.flags.y === true
    if (!confirm) {
      return {
        success: false,
        outputs: [{
          type: 'warning',
          content: `This will permanently delete gist ${gistId}.
Add --yes flag to confirm deletion.`
        }]
      }
    }

    await github.deleteGist(gistId)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Deleted gist ${gistId}`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to delete gist: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
