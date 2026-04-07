import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { GitHubService } from '@/lib/cli/github-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.accessToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')
  const runId = searchParams.get('runId')

  if (!action) {
    return new Response('Missing action parameter', { status: 400 })
  }

  const encoder = new TextEncoder()
  const github = new GitHubService(session.accessToken)

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        switch (action) {
          case 'watch-run':
            if (!owner || !repo || !runId) {
              sendEvent('error', { message: 'Missing required parameters' })
              controller.close()
              return
            }
            await watchWorkflowRun(github, owner, repo, parseInt(runId), sendEvent, controller)
            break
          
          case 'watch-repo':
            if (!owner || !repo) {
              sendEvent('error', { message: 'Missing required parameters' })
              controller.close()
              return
            }
            await watchRepository(github, owner, repo, sendEvent, controller)
            break

          default:
            sendEvent('error', { message: `Unknown action: ${action}` })
            controller.close()
        }
      } catch (error) {
        sendEvent('error', { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

async function watchWorkflowRun(
  github: GitHubService,
  owner: string,
  repo: string,
  runId: number,
  sendEvent: (event: string, data: unknown) => void,
  controller: ReadableStreamDefaultController
) {
  let isComplete = false
  let attempts = 0
  const maxAttempts = 60 // 5 minutes max (5s intervals)

  while (!isComplete && attempts < maxAttempts) {
    try {
      const run = await github.getWorkflowRun(owner, repo, runId)
      
      sendEvent('update', {
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        runNumber: run.runNumber,
        headBranch: run.headBranch,
        event: run.event,
        updatedAt: run.updatedAt
      })

      if (run.status === 'completed') {
        isComplete = true
        sendEvent('complete', {
          conclusion: run.conclusion,
          message: `Workflow ${run.conclusion}`
        })
      } else {
        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    } catch (error) {
      sendEvent('error', {
        message: error instanceof Error ? error.message : 'Failed to fetch run status'
      })
      break
    }
    
    attempts++
  }

  if (attempts >= maxAttempts) {
    sendEvent('timeout', { message: 'Watch timed out after 5 minutes' })
  }

  controller.close()
}

async function watchRepository(
  github: GitHubService,
  owner: string,
  repo: string,
  sendEvent: (event: string, data: unknown) => void,
  controller: ReadableStreamDefaultController
) {
  let lastUpdate = new Date().toISOString()
  let attempts = 0
  const maxAttempts = 120 // 10 minutes (5s intervals)

  // Initial data
  try {
    const repoData = await github.getRepo(owner, repo)
    sendEvent('repo', repoData)

    const issues = await github.listIssues(owner, repo, { state: 'open', per_page: 5 })
    sendEvent('issues', issues)

    const prs = await github.listPullRequests(owner, repo, { state: 'open', per_page: 5 })
    sendEvent('prs', prs)

    const runs = await github.listWorkflowRuns(owner, repo, { per_page: 5 })
    sendEvent('runs', runs)
  } catch (error) {
    sendEvent('error', {
      message: error instanceof Error ? error.message : 'Failed to fetch repository data'
    })
    controller.close()
    return
  }

  // Poll for updates
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    try {
      // Check for new workflow runs
      const runs = await github.listWorkflowRuns(owner, repo, { per_page: 5 })
      const newRuns = runs.filter(run => new Date(run.updatedAt) > new Date(lastUpdate))
      
      if (newRuns.length > 0) {
        sendEvent('runs-update', newRuns)
        lastUpdate = new Date().toISOString()
      }

      // Send heartbeat
      sendEvent('heartbeat', { timestamp: Date.now() })
    } catch (error) {
      sendEvent('error', {
        message: error instanceof Error ? error.message : 'Failed to poll updates'
      })
    }
    
    attempts++
  }

  sendEvent('timeout', { message: 'Watch timed out after 10 minutes' })
  controller.close()
}
