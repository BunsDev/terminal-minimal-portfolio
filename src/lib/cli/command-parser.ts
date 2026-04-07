// Command Parser - Parses CLI-style commands
import type { ParsedCommand } from './types'

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim()
  if (!raw) {
    return {
      command: '',
      args: [],
      flags: {},
      raw: ''
    }
  }

  const tokens = tokenize(raw)
  if (tokens.length === 0) {
    return {
      command: '',
      args: [],
      flags: {},
      raw
    }
  }

  const command = tokens[0].toLowerCase()
  let subcommand: string | undefined
  const args: string[] = []
  const flags: Record<string, string | boolean | number> = {}

  let i = 1

  // Check for subcommand (second token that doesn't start with -)
  if (i < tokens.length && !tokens[i].startsWith('-')) {
    // Could be subcommand or arg
    // Check if it looks like a subcommand (lowercase word)
    if (/^[a-z][a-z-]*$/.test(tokens[i])) {
      subcommand = tokens[i]
      i++
    }
  }

  // Parse remaining tokens
  while (i < tokens.length) {
    const token = tokens[i]

    if (token.startsWith('--')) {
      // Long flag
      const flagPart = token.slice(2)
      if (flagPart.includes('=')) {
        // --flag=value
        const [name, ...valueParts] = flagPart.split('=')
        const value = valueParts.join('=')
        flags[name] = parseValue(value)
      } else {
        // --flag value or --flag (boolean)
        const name = flagPart
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          flags[name] = parseValue(tokens[i + 1])
          i++
        } else {
          flags[name] = true
        }
      }
    } else if (token.startsWith('-') && token.length > 1) {
      // Short flag(s)
      const shortFlags = token.slice(1)
      
      if (shortFlags.length === 1) {
        // Single short flag: -f value or -f (boolean)
        const name = shortFlags
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          flags[name] = parseValue(tokens[i + 1])
          i++
        } else {
          flags[name] = true
        }
      } else {
        // Multiple boolean short flags: -abc
        for (const char of shortFlags) {
          flags[char] = true
        }
      }
    } else {
      // Positional argument
      args.push(token)
    }

    i++
  }

  return {
    command,
    subcommand,
    args,
    flags,
    raw
  }
}

// Tokenize input handling quoted strings
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote: string | null = null
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (escape) {
      current += char
      escape = false
      continue
    }

    if (char === '\\') {
      escape = true
      continue
    }

    if (char === '"' || char === "'") {
      if (inQuote === char) {
        // End quote
        inQuote = null
      } else if (inQuote === null) {
        // Start quote
        inQuote = char
      } else {
        // Quote character inside different quote
        current += char
      }
      continue
    }

    if (char === ' ' && inQuote === null) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

// Parse value to appropriate type
function parseValue(value: string): string | boolean | number {
  // Check for boolean
  if (value === 'true') return true
  if (value === 'false') return false

  // Check for number
  const num = Number(value)
  if (!isNaN(num) && value !== '') return num

  // Return as string
  return value
}

// Format parsed command back to string (for display)
export function formatCommand(parsed: ParsedCommand): string {
  let result = parsed.command

  if (parsed.subcommand) {
    result += ` ${parsed.subcommand}`
  }

  for (const arg of parsed.args) {
    if (arg.includes(' ')) {
      result += ` "${arg}"`
    } else {
      result += ` ${arg}`
    }
  }

  for (const [key, value] of Object.entries(parsed.flags)) {
    if (key.length === 1) {
      result += value === true ? ` -${key}` : ` -${key} ${value}`
    } else {
      result += value === true ? ` --${key}` : ` --${key}=${value}`
    }
  }

  return result
}

// Extract repo from various formats
export function parseRepoArg(arg: string): { owner: string; repo: string } | null {
  // Format: owner/repo
  if (arg.includes('/')) {
    const [owner, repo] = arg.split('/')
    if (owner && repo) {
      return { owner, repo }
    }
  }
  return null
}

// Extract issue/PR number from arg
export function parseNumberArg(arg: string): number | null {
  // Could be #123 or just 123
  const cleaned = arg.replace(/^#/, '')
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}
