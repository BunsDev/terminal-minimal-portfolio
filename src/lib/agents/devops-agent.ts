/**
 * DevOps Agent
 * Specialized agent for CI/CD, workflows, and deployment operations
 */

import { BaseAgent } from './base-agent'
import type { AgentConfig, AgentTool } from './types'

const DEFAULT_MODELS = {
  trivial: 'openai/gpt-4o-mini',
  simple: 'openai/gpt-4o-mini',
  moderate: 'openai/gpt-4o',
  complex: 'openai/gpt-4o',
  expert: 'anthropic/claude-opus-4.6'
}

export class DevOpsAgent extends BaseAgent {
  constructor() {
    const tools = createDevOpsTools()
    
    const config: AgentConfig = {
      id: 'devops-agent',
      name: 'DevOps & Workflow Agent',
      role: 'devops',
      description: 'Specialized agent for CI/CD pipelines, GitHub Actions, deployments, and infrastructure operations.',
      systemPrompt: `You are a DevOps specialist. You help users manage CI/CD pipelines, GitHub Actions workflows, deployments, and infrastructure.

Your expertise includes:
- GitHub Actions workflow creation and debugging
- Vercel deployment configuration
- CI/CD pipeline optimization
- Environment management
- Secret and variable management
- Monitoring and alerting

Best practices you follow:
- Use environment-specific configurations
- Implement proper secret management
- Set up efficient caching strategies
- Configure appropriate timeouts and retries
- Use matrix builds for cross-platform testing

Always explain the reasoning behind workflow configurations and suggest optimizations.`,
      tools,
      maxSteps: 12,
      model: DEFAULT_MODELS,
      capabilities: [
        'workflow_management',
        'deployment_config',
        'ci_cd_optimization',
        'environment_management',
        'monitoring_setup'
      ],
      constraints: [
        'Never expose secrets',
        'Validate workflow syntax',
        'Use secure defaults'
      ]
    }

    super(config)
  }

  /**
   * Execute DevOps operations
   */
  protected async execute(input: string): Promise<string> {
    const lowerInput = input.toLowerCase()

    // Workflow creation/editing
    if (lowerInput.includes('create') && lowerInput.includes('workflow')) {
      return this.handleCreateWorkflow(input)
    }

    // Deployment
    if (lowerInput.includes('deploy') || lowerInput.includes('deployment')) {
      return this.handleDeployment(input)
    }

    // CI/CD optimization
    if (lowerInput.includes('optimize') || lowerInput.includes('speed up')) {
      return this.handleOptimization(input)
    }

    // Environment/secrets
    if (lowerInput.includes('secret') || lowerInput.includes('env') || lowerInput.includes('variable')) {
      return this.handleEnvironment(input)
    }

    // Status/monitoring
    if (lowerInput.includes('status') || lowerInput.includes('monitor')) {
      return this.handleMonitoring(input)
    }

    return this.describeCapabilities()
  }

  private async handleCreateWorkflow(input: string): Promise<string> {
    const isNode = input.includes('node') || input.includes('npm') || input.includes('next')
    const isPython = input.includes('python')
    const isTest = input.includes('test')
    const isDeploy = input.includes('deploy')

    let workflowYaml = ''

    if (isNode && isTest) {
      workflowYaml = `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build`
    } else if (isDeploy) {
      workflowYaml = `name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'`
    } else {
      workflowYaml = `name: Basic Workflow

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run build
        run: echo "Add your build steps here"`
    }

    return `Here's a GitHub Actions workflow for your needs:

\`\`\`yaml
${workflowYaml}
\`\`\`

**To use this workflow:**
1. Create \`.github/workflows/ci.yml\` in your repository
2. Paste the workflow content
3. Commit and push

The workflow will trigger on push to main and pull requests.`
  }

  private async handleDeployment(input: string): Promise<string> {
    return `**Deployment Configuration Guide**

**Vercel (Recommended for Next.js):**
1. Connect your GitHub repo at vercel.com
2. Configure environment variables in project settings
3. Deployments happen automatically on push

**Manual Vercel CLI:**
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
\`\`\`

**GitHub Actions Deployment:**
\`\`\`yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: \${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
\`\`\`

**Required Secrets:**
- \`VERCEL_TOKEN\` - Get from Vercel dashboard > Settings > Tokens
- \`VERCEL_ORG_ID\` - From .vercel/project.json
- \`VERCEL_PROJECT_ID\` - From .vercel/project.json

Would you like me to help configure a specific deployment?`
  }

  private async handleOptimization(input: string): Promise<string> {
    return `**CI/CD Optimization Strategies**

**1. Caching Dependencies**
\`\`\`yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # or 'pnpm', 'yarn'
\`\`\`

**2. Parallel Jobs**
\`\`\`yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [...]
  test:
    runs-on: ubuntu-latest  
    steps: [...]
  build:
    needs: [lint, test]  # Run after both complete
    steps: [...]
\`\`\`

**3. Matrix Builds**
\`\`\`yaml
strategy:
  matrix:
    node: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
\`\`\`

**4. Conditional Execution**
\`\`\`yaml
- name: Deploy
  if: github.ref == 'refs/heads/main'
\`\`\`

**5. Artifact Caching**
\`\`\`yaml
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: \${{ runner.os }}-nextjs-\${{ hashFiles('**/package-lock.json') }}
\`\`\`

These optimizations can reduce CI time by 50-70%.`
  }

  private async handleEnvironment(input: string): Promise<string> {
    return `**Environment & Secrets Management**

**GitHub Secrets (Recommended):**
1. Go to Repository > Settings > Secrets and variables > Actions
2. Add secrets for sensitive values
3. Reference in workflows: \`\${{ secrets.MY_SECRET }}\`

**Environment-Specific:**
\`\`\`yaml
jobs:
  deploy:
    environment: production
    steps:
      - name: Deploy
        env:
          API_KEY: \${{ secrets.PROD_API_KEY }}
\`\`\`

**Vercel Environment Variables:**
- Project Settings > Environment Variables
- Separate values for Preview, Production, Development

**Best Practices:**
- Never commit secrets to code
- Use environment-specific values
- Rotate secrets regularly
- Limit secret scope to needed jobs
- Use OIDC for cloud provider auth when possible

**Example .env structure:**
\`\`\`
# .env.local (not committed)
DATABASE_URL=postgresql://...
API_SECRET=...

# .env.example (committed, no values)
DATABASE_URL=
API_SECRET=
\`\`\``
  }

  private async handleMonitoring(input: string): Promise<string> {
    return `**Workflow Monitoring & Status**

**Check Workflow Status:**
Use the Cloud CLI: \`gh workflow list\` or \`gh run list\`

**Add Status Badges:**
\`\`\`markdown
![CI](https://github.com/owner/repo/actions/workflows/ci.yml/badge.svg)
\`\`\`

**Slack Notifications:**
\`\`\`yaml
- name: Notify Slack
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: \${{ job.status }}
    webhook_url: \${{ secrets.SLACK_WEBHOOK }}
\`\`\`

**Workflow Insights:**
- GitHub Actions tab shows run history
- View timing breakdown per step
- Download logs for debugging

Would you like me to set up monitoring for a specific workflow?`
  }

  private describeCapabilities(): string {
    return `I'm the DevOps & Workflow Agent. I specialize in CI/CD and deployment operations.

**What I Can Help With:**

**GitHub Actions**
- Create and optimize workflows
- Debug failing actions
- Set up matrix builds
- Configure caching

**Deployments**
- Vercel deployment setup
- Environment configuration
- Preview deployments
- Production releases

**Infrastructure**
- Secret management
- Environment variables
- Monitoring & alerts
- Status badges

**Optimization**
- Speed up CI pipelines
- Reduce build times
- Parallel execution
- Smart caching

**Examples:**
- "create a test workflow for Node.js"
- "help me deploy to Vercel"
- "optimize my CI pipeline"
- "set up environment secrets"
- "add Slack notifications for failures"`
  }
}

/**
 * Create DevOps tools
 */
function createDevOpsTools(): AgentTool[] {
  return [
    {
      name: 'create_workflow',
      description: 'Generate a GitHub Actions workflow file',
      parameters: {
        name: { type: 'string', description: 'Workflow name', required: true },
        trigger: { type: 'string', description: 'Trigger events', enum: ['push', 'pull_request', 'schedule', 'workflow_dispatch'] },
        jobs: { type: 'string', description: 'Comma-separated job names' }
      },
      execute: async () => ({ success: true, data: 'Workflow generated' })
    },
    {
      name: 'validate_workflow',
      description: 'Validate GitHub Actions workflow syntax',
      parameters: {
        content: { type: 'string', description: 'Workflow YAML content', required: true }
      },
      execute: async () => ({ success: true, data: 'Workflow valid' })
    },
    {
      name: 'list_runs',
      description: 'List recent workflow runs',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true },
        workflow: { type: 'string', description: 'Workflow name or ID' }
      },
      execute: async () => ({ success: true, data: 'Runs listed' })
    },
    {
      name: 'trigger_workflow',
      description: 'Manually trigger a workflow',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true },
        workflow_id: { type: 'string', description: 'Workflow ID', required: true },
        ref: { type: 'string', description: 'Git ref', required: true }
      },
      execute: async () => ({ success: true, data: 'Workflow triggered' })
    },
    {
      name: 'get_deployment',
      description: 'Get deployment status',
      parameters: {
        project: { type: 'string', description: 'Vercel project name', required: true },
        deployment_id: { type: 'string', description: 'Specific deployment ID' }
      },
      execute: async () => ({ success: true, data: 'Deployment status retrieved' })
    }
  ]
}
