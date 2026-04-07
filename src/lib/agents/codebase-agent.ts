/**
 * Codebase Agent
 * Specialized agent for code analysis and understanding
 */

import { BaseAgent } from './base-agent'
import type { AgentConfig, AgentTool } from './types'

const DEFAULT_MODELS = {
  trivial: 'openai/gpt-4o-mini',
  simple: 'openai/gpt-4o-mini',
  moderate: 'openai/gpt-4o',
  complex: 'anthropic/claude-opus-4.6',
  expert: 'anthropic/claude-opus-4.6'
}

export class CodebaseAgent extends BaseAgent {
  private sandboxId: string | null = null

  constructor() {
    const tools = createCodebaseTools()
    
    const config: AgentConfig = {
      id: 'codebase-agent',
      name: 'Codebase Analysis Agent',
      role: 'codebase',
      description: 'Specialized agent for searching, analyzing, and understanding codebases using file-based search in isolated sandboxes.',
      systemPrompt: `You are a codebase analysis specialist. You help users understand, search, and navigate codebases efficiently.

Your approach (following knowledge-agent-template patterns):
1. Use grep, find, and cat commands in sandboxes - no embeddings needed
2. Search systematically: broad patterns first, then refine
3. Explain findings clearly with file paths and line numbers
4. Provide actionable insights about code structure

Your capabilities include:
- File-based search using grep patterns
- Finding files by name or extension
- Reading and explaining code files
- Analyzing code structure and dependencies
- Identifying patterns and anti-patterns
- Suggesting improvements

Always show your search process - what you're looking for and why.`,
      tools,
      maxSteps: 15,
      model: DEFAULT_MODELS,
      capabilities: [
        'file_search',
        'code_reading',
        'pattern_matching',
        'structure_analysis',
        'dependency_tracking'
      ],
      constraints: [
        'Execute in sandbox only',
        'Block dangerous commands',
        'Respect file size limits'
      ]
    }

    super(config)
  }

  /**
   * Set sandbox for execution
   */
  setSandbox(sandboxId: string): void {
    this.sandboxId = sandboxId
  }

  /**
   * Execute codebase analysis
   */
  protected async execute(input: string): Promise<string> {
    const lowerInput = input.toLowerCase()

    // Pattern search
    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('grep')) {
      return this.handleSearch(input)
    }

    // File reading
    if (lowerInput.includes('read') || lowerInput.includes('show') || lowerInput.includes('cat')) {
      return this.handleReadFile(input)
    }

    // Structure analysis
    if (lowerInput.includes('structure') || lowerInput.includes('architecture') || lowerInput.includes('overview')) {
      return this.handleStructureAnalysis(input)
    }

    // Dependencies
    if (lowerInput.includes('depend') || lowerInput.includes('import')) {
      return this.handleDependencyAnalysis(input)
    }

    return this.describeCapabilities()
  }

  private async handleSearch(input: string): Promise<string> {
    // Extract search pattern
    const patternMatch = input.match(/(?:for|pattern|search)\s+["']([^"']+)["']/i) ||
                         input.match(/(?:for|pattern|search)\s+(\S+)/i)
    
    if (!patternMatch) {
      return 'Please specify a search pattern (e.g., "search for \'useState\'" or "find files matching *.tsx")'
    }
    
    const pattern = patternMatch[1]
    
    // Simulate sandbox grep command
    return `Searching for pattern: \`${pattern}\`

**Command executed:**
\`\`\`bash
grep -rn "${pattern}" --include="*.{ts,tsx,js,jsx}" .
\`\`\`

**Results:**
To execute this search, connect to a sandbox with your codebase. The search will:
1. Recursively search all TypeScript/JavaScript files
2. Show matching lines with file paths and line numbers
3. Return deterministic, explainable results

Use the Cloud CLI to connect a repository and search.`
  }

  private async handleReadFile(input: string): Promise<string> {
    const fileMatch = input.match(/(?:read|show|cat|file)\s+["']?([^\s"']+)["']?/i)
    
    if (!fileMatch) {
      return 'Please specify a file path (e.g., "read src/app/page.tsx")'
    }
    
    const filePath = fileMatch[1]
    
    return `Reading file: \`${filePath}\`

**Command:**
\`\`\`bash
cat "${filePath}"
\`\`\`

To read files, ensure you're connected to a sandbox with the codebase cloned.`
  }

  private async handleStructureAnalysis(input: string): Promise<string> {
    return `**Codebase Structure Analysis**

To analyze a codebase structure, I would execute:

\`\`\`bash
# Find all directories
find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*'

# Count files by type
find . -type f -name "*.ts" | wc -l
find . -type f -name "*.tsx" | wc -l

# Find entry points
find . -name "page.tsx" -o -name "layout.tsx" -o -name "index.ts"

# Analyze package.json for dependencies
cat package.json | jq '.dependencies, .devDependencies'
\`\`\`

Connect a repository via the Cloud CLI to get a detailed structure analysis.`
  }

  private async handleDependencyAnalysis(input: string): Promise<string> {
    return `**Dependency Analysis**

To analyze dependencies, I would:

1. **Find all imports:**
\`\`\`bash
grep -rh "^import" --include="*.ts" --include="*.tsx" | sort | uniq -c | sort -rn
\`\`\`

2. **Check external dependencies:**
\`\`\`bash
cat package.json | jq '.dependencies'
\`\`\`

3. **Find circular dependencies:**
\`\`\`bash
# Trace import chains between files
\`\`\`

Connect a repository to run this analysis.`
  }

  private describeCapabilities(): string {
    return `I'm the Codebase Analysis Agent. I help you understand and navigate code using file-based search.

**How I Work (No Vector DB Needed):**
- Uses grep, find, and cat in isolated sandboxes
- Deterministic, explainable results
- Real-time file search across your sources

**What I Can Do:**

**Search Code**
- Pattern matching with grep
- Find files by name or extension
- Search across specific file types

**Read & Explain**
- Read file contents
- Explain code structure
- Identify key components

**Analyze Structure**
- Map directory structure
- Find entry points and exports
- Track dependencies

**Examples:**
- "search for 'useEffect'"
- "find all *.tsx files"
- "show the structure of src/"
- "analyze imports in this file"

Connect a repository via Cloud CLI to start analyzing.`
  }
}

/**
 * Create codebase analysis tools
 */
function createCodebaseTools(): AgentTool[] {
  return [
    {
      name: 'grep',
      description: 'Search for patterns in files using grep',
      parameters: {
        pattern: { type: 'string', description: 'Search pattern (regex supported)', required: true },
        path: { type: 'string', description: 'Path to search in' },
        include: { type: 'string', description: 'File pattern to include (e.g., "*.ts")' },
        recursive: { type: 'boolean', description: 'Search recursively' }
      },
      execute: async (params) => ({
        success: true,
        data: `grep -${params.recursive ? 'r' : ''}n "${params.pattern}" ${params.path || '.'}`
      })
    },
    {
      name: 'find',
      description: 'Find files by name or pattern',
      parameters: {
        path: { type: 'string', description: 'Starting path' },
        name: { type: 'string', description: 'File name pattern' },
        type: { type: 'string', description: 'Type: f (file) or d (directory)', enum: ['f', 'd'] }
      },
      execute: async (params) => ({
        success: true,
        data: `find ${params.path || '.'} -type ${params.type || 'f'} -name "${params.name}"`
      })
    },
    {
      name: 'cat',
      description: 'Read file contents',
      parameters: {
        path: { type: 'string', description: 'File path to read', required: true },
        lines: { type: 'number', description: 'Number of lines to read (head)' }
      },
      execute: async (params) => ({
        success: true,
        data: params.lines ? `head -n ${params.lines} "${params.path}"` : `cat "${params.path}"`
      })
    },
    {
      name: 'tree',
      description: 'Display directory structure',
      parameters: {
        path: { type: 'string', description: 'Starting path' },
        depth: { type: 'number', description: 'Max depth to display' }
      },
      execute: async (params) => ({
        success: true,
        data: `tree ${params.path || '.'} -L ${params.depth || 3}`
      })
    },
    {
      name: 'wc',
      description: 'Count lines, words, or characters',
      parameters: {
        path: { type: 'string', description: 'File or pattern', required: true },
        mode: { type: 'string', description: 'Count mode: lines, words, chars', enum: ['lines', 'words', 'chars'] }
      },
      execute: async (params) => ({
        success: true,
        data: `wc -${params.mode === 'lines' ? 'l' : params.mode === 'words' ? 'w' : 'c'} ${params.path}`
      })
    }
  ]
}
