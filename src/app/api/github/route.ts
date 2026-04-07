import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GitHubService } from '@/lib/cli/github-service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, params } = body

    const github = new GitHubService(session.accessToken)

    switch (action) {
      // User
      case 'getCurrentUser':
        return NextResponse.json(await github.getCurrentUser())
      
      case 'getUser':
        return NextResponse.json(await github.getUser(params.username))

      // Repos
      case 'listRepos':
        return NextResponse.json(await github.listRepos(params))
      
      case 'getRepo':
        return NextResponse.json(await github.getRepo(params.owner, params.repo))
      
      case 'createRepo':
        return NextResponse.json(await github.createRepo(params))
      
      case 'deleteRepo':
        await github.deleteRepo(params.owner, params.repo)
        return NextResponse.json({ success: true })
      
      case 'forkRepo':
        return NextResponse.json(await github.forkRepo(params.owner, params.repo))
      
      case 'cloneUrl':
        return NextResponse.json(await github.cloneUrl(params.owner, params.repo))

      // Issues
      case 'listIssues':
        return NextResponse.json(await github.listIssues(params.owner, params.repo, params.options))
      
      case 'getIssue':
        return NextResponse.json(await github.getIssue(params.owner, params.repo, params.issue_number))
      
      case 'createIssue':
        return NextResponse.json(await github.createIssue(params.owner, params.repo, params.options))
      
      case 'updateIssue':
        return NextResponse.json(await github.updateIssue(params.owner, params.repo, params.issue_number, params.options))
      
      case 'closeIssue':
        return NextResponse.json(await github.closeIssue(params.owner, params.repo, params.issue_number))
      
      case 'reopenIssue':
        return NextResponse.json(await github.reopenIssue(params.owner, params.repo, params.issue_number))

      // Pull Requests
      case 'listPullRequests':
        return NextResponse.json(await github.listPullRequests(params.owner, params.repo, params.options))
      
      case 'getPullRequest':
        return NextResponse.json(await github.getPullRequest(params.owner, params.repo, params.pull_number))
      
      case 'createPullRequest':
        return NextResponse.json(await github.createPullRequest(params.owner, params.repo, params.options))
      
      case 'mergePullRequest':
        return NextResponse.json(await github.mergePullRequest(params.owner, params.repo, params.pull_number, params.options))
      
      case 'closePullRequest':
        return NextResponse.json(await github.closePullRequest(params.owner, params.repo, params.pull_number))

      // Workflows
      case 'listWorkflows':
        return NextResponse.json(await github.listWorkflows(params.owner, params.repo))
      
      case 'listWorkflowRuns':
        return NextResponse.json(await github.listWorkflowRuns(params.owner, params.repo, params.options))
      
      case 'getWorkflowRun':
        return NextResponse.json(await github.getWorkflowRun(params.owner, params.repo, params.run_id))
      
      case 'triggerWorkflow':
        await github.triggerWorkflow(params.owner, params.repo, params.workflow_id, params.ref, params.inputs)
        return NextResponse.json({ success: true })
      
      case 'cancelWorkflowRun':
        await github.cancelWorkflowRun(params.owner, params.repo, params.run_id)
        return NextResponse.json({ success: true })
      
      case 'rerunWorkflow':
        await github.rerunWorkflow(params.owner, params.repo, params.run_id)
        return NextResponse.json({ success: true })

      // Gists
      case 'listGists':
        return NextResponse.json(await github.listGists(params))
      
      case 'getGist':
        return NextResponse.json(await github.getGist(params.gist_id))
      
      case 'createGist':
        return NextResponse.json(await github.createGist(params))
      
      case 'updateGist':
        return NextResponse.json(await github.updateGist(params.gist_id, params.options))
      
      case 'deleteGist':
        await github.deleteGist(params.gist_id)
        return NextResponse.json({ success: true })

      // Releases
      case 'listReleases':
        return NextResponse.json(await github.listReleases(params.owner, params.repo, params.options))
      
      case 'getRelease':
        return NextResponse.json(await github.getRelease(params.owner, params.repo, params.release_id))
      
      case 'getLatestRelease':
        return NextResponse.json(await github.getLatestRelease(params.owner, params.repo))
      
      case 'createRelease':
        return NextResponse.json(await github.createRelease(params.owner, params.repo, params.options))
      
      case 'deleteRelease':
        await github.deleteRelease(params.owner, params.repo, params.release_id)
        return NextResponse.json({ success: true })

      // Organizations
      case 'listOrgs':
        return NextResponse.json(await github.listOrgs())
      
      case 'getOrg':
        return NextResponse.json(await github.getOrg(params.org))
      
      case 'listOrgRepos':
        return NextResponse.json(await github.listOrgRepos(params.org, params.options))

      // Search
      case 'searchRepos':
        return NextResponse.json(await github.searchRepos(params.query, params.options))
      
      case 'searchIssues':
        return NextResponse.json(await github.searchIssues(params.query, params.options))

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('GitHub API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await auth()
  
  if (!session?.accessToken) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    const github = new GitHubService(session.accessToken)
    const user = await github.getCurrentUser()
    return NextResponse.json({ authenticated: true, user })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
