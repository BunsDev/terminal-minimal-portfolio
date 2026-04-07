// Command Registry - All available CLI commands
import type { CommandDefinition, ParsedCommand, CommandContext, CommandResult } from '../types'
import { repoCommands } from './repo'
import { issueCommands } from './issue'
import { prCommands } from './pr'
import { workflowCommands } from './workflow'
import { gistCommands } from './gist'
import { releaseCommands } from './release'
import { orgCommands } from './org'

// Built-in commands
const helpCommand: CommandDefinition = {
  name: 'help',
  description: 'Display help information about commands',
  usage: 'help [command]',
  examples: ['help', 'help repo', 'help issue create'],
  handler: async (args, context) => {
    const outputs: CommandResult['outputs'] = []
    
    if (args.args.length === 0) {
      // Show all commands
      outputs.push({
        type: 'info',
        content: `
GitHub Cloud CLI - Available Commands

REPOSITORY COMMANDS
  gh repo list          List repositories
  gh repo view          View repository details
  gh repo create        Create a new repository
  gh repo clone         Get clone URLs
  gh repo fork          Fork a repository
  gh repo delete        Delete a repository

ISSUE COMMANDS
  gh issue list         List issues
  gh issue view         View issue details
  gh issue create       Create a new issue
  gh issue close        Close an issue
  gh issue reopen       Reopen an issue
  gh issue edit         Edit an issue

PULL REQUEST COMMANDS
  gh pr list            List pull requests
  gh pr view            View PR details
  gh pr create          Create a new PR
  gh pr merge           Merge a PR
  gh pr close           Close a PR
  gh pr diff            View PR diff

WORKFLOW COMMANDS
  gh workflow list      List workflows
  gh run list           List workflow runs
  gh run view           View run details
  gh run watch          Watch a run in progress
  gh workflow run       Trigger a workflow

GIST COMMANDS
  gh gist list          List your gists
  gh gist view          View a gist
  gh gist create        Create a new gist
  gh gist edit          Edit a gist
  gh gist delete        Delete a gist

RELEASE COMMANDS
  gh release list       List releases
  gh release view       View release details
  gh release create     Create a new release
  gh release delete     Delete a release

ORGANIZATION COMMANDS
  gh org list           List organizations
  gh org view           View organization details

OTHER COMMANDS
  gh auth status        Check authentication status
  gh api                Make raw API requests
  help                  Show this help
  clear                 Clear terminal

Use "help <command>" for more information about a command.
`
      })
    } else {
      // Show help for specific command
      const cmdName = args.args[0]
      const subCmd = args.args[1]
      const cmd = commands[cmdName]
      
      if (!cmd) {
        return {
          success: false,
          outputs: [{
            type: 'error',
            content: `Unknown command: ${cmdName}`
          }]
        }
      }

      let helpText = `
${cmd.name.toUpperCase()}
  ${cmd.description}

USAGE
  ${cmd.usage}
`

      if (cmd.subcommands && cmd.subcommands.length > 0) {
        helpText += '\nSUBCOMMANDS\n'
        for (const sub of cmd.subcommands) {
          helpText += `  ${sub.name.padEnd(15)} ${sub.description}\n`
        }
      }

      if (cmd.flags && cmd.flags.length > 0) {
        helpText += '\nFLAGS\n'
        for (const flag of cmd.flags) {
          const shorthand = flag.shorthand ? `-${flag.shorthand}, ` : '    '
          helpText += `  ${shorthand}--${flag.name.padEnd(12)} ${flag.description}\n`
        }
      }

      if (cmd.examples && cmd.examples.length > 0) {
        helpText += '\nEXAMPLES\n'
        for (const example of cmd.examples) {
          helpText += `  $ ${example}\n`
        }
      }

      outputs.push({ type: 'info', content: helpText })
    }

    return { success: true, outputs }
  }
}

const clearCommand: CommandDefinition = {
  name: 'clear',
  description: 'Clear terminal output',
  usage: 'clear',
  handler: async (args, context) => {
    // Return special clear signal
    return {
      success: true,
      outputs: [],
      data: { action: 'clear' }
    }
  }
}

const authCommand: CommandDefinition = {
  name: 'auth',
  description: 'Manage authentication',
  usage: 'gh auth <subcommand>',
  subcommands: [
    { name: 'status', description: 'View authentication status', usage: 'gh auth status', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'login', description: 'Authenticate with GitHub', usage: 'gh auth login', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'logout', description: 'Log out of GitHub', usage: 'gh auth logout', handler: async () => ({ success: true, outputs: [] }) }
  ],
  handler: async (args, context) => {
    const subcommand = args.subcommand || 'status'

    if (subcommand === 'status') {
      if (context.user) {
        return {
          success: true,
          outputs: [{
            type: 'success',
            content: `Logged in to github.com as ${context.user.login}

  Token: *****
  Token scopes: repo, workflow, gist, admin:org
`
          }]
        }
      } else {
        return {
          success: true,
          outputs: [{
            type: 'warning',
            content: `Not logged in to github.com

Run "Sign in with GitHub" to authenticate.
`
          }]
        }
      }
    }

    if (subcommand === 'login') {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: 'Click the "Sign in with GitHub" button to authenticate.'
        }],
        data: { action: 'login' }
      }
    }

    if (subcommand === 'logout') {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: 'Logging out...'
        }],
        data: { action: 'logout' }
      }
    }

    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Unknown subcommand: ${subcommand}`
      }]
    }
  }
}

const whoamiCommand: CommandDefinition = {
  name: 'whoami',
  description: 'Display current user',
  usage: 'whoami',
  handler: async (args, context) => {
    if (!context.user) {
      return {
        success: false,
        outputs: [{
          type: 'warning',
          content: 'Not logged in. Run "Sign in with GitHub" to authenticate.'
        }]
      }
    }

    return {
      success: true,
      outputs: [{
        type: 'info',
        content: `${context.user.login}`
      }]
    }
  }
}

// Main command registry
export const commands: Record<string, CommandDefinition> = {
  help: helpCommand,
  clear: clearCommand,
  auth: authCommand,
  whoami: whoamiCommand,
  // GitHub CLI commands (aliased to 'gh')
  gh: {
    name: 'gh',
    description: 'GitHub CLI commands',
    usage: 'gh <command> [subcommand] [flags]',
    handler: async (args, context) => {
      // Route to appropriate command
      const subcommand = args.subcommand
      
      if (!subcommand) {
        return helpCommand.handler(args, context)
      }

      const routedCommand = ghSubcommands[subcommand]
      if (!routedCommand) {
        return {
          success: false,
          outputs: [{
            type: 'error',
            content: `Unknown command: gh ${subcommand}\nRun "help" for usage.`
          }]
        }
      }

      // Re-parse the command with subcommand as main command
      const newArgs: ParsedCommand = {
        ...args,
        command: subcommand,
        subcommand: args.args[0],
        args: args.args.slice(1)
      }

      return routedCommand.handler(newArgs, context)
    }
  },
  // Direct aliases
  repo: repoCommands,
  issue: issueCommands,
  pr: prCommands,
  workflow: workflowCommands,
  run: workflowCommands, // Alias for workflow runs
  gist: gistCommands,
  release: releaseCommands,
  org: orgCommands
}

// Subcommand routing for 'gh' prefix
const ghSubcommands: Record<string, CommandDefinition> = {
  repo: repoCommands,
  issue: issueCommands,
  pr: prCommands,
  workflow: workflowCommands,
  run: workflowCommands,
  gist: gistCommands,
  release: releaseCommands,
  org: orgCommands,
  auth: authCommand,
  api: {
    name: 'api',
    description: 'Make raw API requests',
    usage: 'gh api <endpoint>',
    handler: async (args, context) => {
      return {
        success: false,
        outputs: [{
          type: 'warning',
          content: 'Raw API requests are not yet supported in the cloud CLI.'
        }]
      }
    }
  }
}

// Execute a command
export async function executeCommand(
  parsed: ParsedCommand,
  context: CommandContext
): Promise<CommandResult> {
  const { command } = parsed

  if (!command) {
    return {
      success: true,
      outputs: []
    }
  }

  const cmd = commands[command]
  
  if (!cmd) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Command not found: ${command}\nRun "help" for available commands.`
      }]
    }
  }

  try {
    return await cmd.handler(parsed, context)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Error executing command: ${message}`
      }]
    }
  }
}
