// GitHub API Service using Octokit
import { Octokit } from 'octokit'
import type {
  GitHubUser,
  GitHubRepo,
  GitHubIssue,
  GitHubPullRequest,
  GitHubWorkflow,
  GitHubWorkflowRun,
  GitHubGist,
  GitHubRelease,
  GitHubOrg
} from './types'

export class GitHubService {
  private octokit: Octokit

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token })
  }

  // User Operations
  async getCurrentUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.rest.users.getAuthenticated()
    return {
      id: data.id,
      login: data.login,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      publicRepos: data.public_repos,
      followers: data.followers,
      following: data.following
    }
  }

  async getUser(username: string): Promise<GitHubUser> {
    const { data } = await this.octokit.rest.users.getByUsername({ username })
    return {
      id: data.id,
      login: data.login,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      publicRepos: data.public_repos,
      followers: data.followers,
      following: data.following
    }
  }

  // Repository Operations
  async listRepos(options?: {
    visibility?: 'all' | 'public' | 'private'
    sort?: 'created' | 'updated' | 'pushed' | 'full_name'
    per_page?: number
    page?: number
  }): Promise<GitHubRepo[]> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      visibility: options?.visibility || 'all',
      sort: options?.sort || 'updated',
      per_page: options?.per_page || 30,
      page: options?.page || 1
    })
    return data.map(this.mapRepo)
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const { data } = await this.octokit.rest.repos.get({ owner, repo })
    return this.mapRepo(data)
  }

  async createRepo(options: {
    name: string
    description?: string
    private?: boolean
    auto_init?: boolean
  }): Promise<GitHubRepo> {
    const { data } = await this.octokit.rest.repos.createForAuthenticatedUser(options)
    return this.mapRepo(data)
  }

  async deleteRepo(owner: string, repo: string): Promise<void> {
    await this.octokit.rest.repos.delete({ owner, repo })
  }

  async forkRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const { data } = await this.octokit.rest.repos.createFork({ owner, repo })
    return this.mapRepo(data)
  }

  async cloneUrl(owner: string, repo: string): Promise<{ https: string; ssh: string }> {
    const { data } = await this.octokit.rest.repos.get({ owner, repo })
    return {
      https: data.clone_url,
      ssh: data.ssh_url
    }
  }

  // Issue Operations
  async listIssues(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all'
    labels?: string
    sort?: 'created' | 'updated' | 'comments'
    per_page?: number
    page?: number
  }): Promise<GitHubIssue[]> {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: options?.state || 'open',
      labels: options?.labels,
      sort: options?.sort || 'created',
      per_page: options?.per_page || 30,
      page: options?.page || 1
    })
    return data
      .filter(issue => !issue.pull_request)
      .map(this.mapIssue)
  }

  async getIssue(owner: string, repo: string, issue_number: number): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.get({ owner, repo, issue_number })
    return this.mapIssue(data)
  }

  async createIssue(owner: string, repo: string, options: {
    title: string
    body?: string
    labels?: string[]
    assignees?: string[]
  }): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      ...options
    })
    return this.mapIssue(data)
  }

  async updateIssue(owner: string, repo: string, issue_number: number, options: {
    title?: string
    body?: string
    state?: 'open' | 'closed'
    labels?: string[]
    assignees?: string[]
  }): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.update({
      owner,
      repo,
      issue_number,
      ...options
    })
    return this.mapIssue(data)
  }

  async closeIssue(owner: string, repo: string, issue_number: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issue_number, { state: 'closed' })
  }

  async reopenIssue(owner: string, repo: string, issue_number: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issue_number, { state: 'open' })
  }

  // Pull Request Operations
  async listPullRequests(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all'
    sort?: 'created' | 'updated' | 'popularity' | 'long-running'
    per_page?: number
    page?: number
  }): Promise<GitHubPullRequest[]> {
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state: options?.state || 'open',
      sort: options?.sort || 'created',
      per_page: options?.per_page || 30,
      page: options?.page || 1
    })
    return data.map(this.mapPullRequest)
  }

  async getPullRequest(owner: string, repo: string, pull_number: number): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.rest.pulls.get({ owner, repo, pull_number })
    return this.mapPullRequest(data)
  }

  async createPullRequest(owner: string, repo: string, options: {
    title: string
    body?: string
    head: string
    base: string
    draft?: boolean
  }): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.rest.pulls.create({
      owner,
      repo,
      ...options
    })
    return this.mapPullRequest(data)
  }

  async mergePullRequest(owner: string, repo: string, pull_number: number, options?: {
    commit_title?: string
    commit_message?: string
    merge_method?: 'merge' | 'squash' | 'rebase'
  }): Promise<{ merged: boolean; message: string }> {
    const { data } = await this.octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number,
      ...options
    })
    return { merged: data.merged, message: data.message }
  }

  async closePullRequest(owner: string, repo: string, pull_number: number): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.rest.pulls.update({
      owner,
      repo,
      pull_number,
      state: 'closed'
    })
    return this.mapPullRequest(data)
  }

  // Workflow Operations
  async listWorkflows(owner: string, repo: string): Promise<GitHubWorkflow[]> {
    const { data } = await this.octokit.rest.actions.listRepoWorkflows({ owner, repo })
    return data.workflows.map(this.mapWorkflow)
  }

  async listWorkflowRuns(owner: string, repo: string, options?: {
    workflow_id?: number
    status?: 'queued' | 'in_progress' | 'completed'
    per_page?: number
    page?: number
  }): Promise<GitHubWorkflowRun[]> {
    const params: Record<string, unknown> = {
      owner,
      repo,
      per_page: options?.per_page || 30,
      page: options?.page || 1
    }
    if (options?.status) params.status = options.status

    let data
    if (options?.workflow_id) {
      const response = await this.octokit.rest.actions.listWorkflowRuns({
        ...params,
        workflow_id: options.workflow_id
      } as Parameters<typeof this.octokit.rest.actions.listWorkflowRuns>[0])
      data = response.data
    } else {
      const response = await this.octokit.rest.actions.listWorkflowRunsForRepo(
        params as Parameters<typeof this.octokit.rest.actions.listWorkflowRunsForRepo>[0]
      )
      data = response.data
    }
    return data.workflow_runs.map(this.mapWorkflowRun)
  }

  async getWorkflowRun(owner: string, repo: string, run_id: number): Promise<GitHubWorkflowRun> {
    const { data } = await this.octokit.rest.actions.getWorkflowRun({ owner, repo, run_id })
    return this.mapWorkflowRun(data)
  }

  async triggerWorkflow(owner: string, repo: string, workflow_id: number | string, ref: string, inputs?: Record<string, string>): Promise<void> {
    await this.octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id,
      ref,
      inputs
    })
  }

  async cancelWorkflowRun(owner: string, repo: string, run_id: number): Promise<void> {
    await this.octokit.rest.actions.cancelWorkflowRun({ owner, repo, run_id })
  }

  async rerunWorkflow(owner: string, repo: string, run_id: number): Promise<void> {
    await this.octokit.rest.actions.reRunWorkflow({ owner, repo, run_id })
  }

  // Gist Operations
  async listGists(options?: {
    per_page?: number
    page?: number
  }): Promise<GitHubGist[]> {
    const { data } = await this.octokit.rest.gists.list({
      per_page: options?.per_page || 30,
      page: options?.page || 1
    })
    return data.map(this.mapGist)
  }

  async getGist(gist_id: string): Promise<GitHubGist> {
    const { data } = await this.octokit.rest.gists.get({ gist_id })
    return this.mapGist(data)
  }

  async createGist(options: {
    description?: string
    public?: boolean
    files: Record<string, { content: string }>
  }): Promise<GitHubGist> {
    const { data } = await this.octokit.rest.gists.create(options)
    return this.mapGist(data)
  }

  async updateGist(gist_id: string, options: {
    description?: string
    files?: Record<string, { content?: string; filename?: string } | null>
  }): Promise<GitHubGist> {
    const { data } = await this.octokit.rest.gists.update({ gist_id, ...options })
    return this.mapGist(data)
  }

  async deleteGist(gist_id: string): Promise<void> {
    await this.octokit.rest.gists.delete({ gist_id })
  }

  // Release Operations
  async listReleases(owner: string, repo: string, options?: {
    per_page?: number
    page?: number
  }): Promise<GitHubRelease[]> {
    const { data } = await this.octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: options?.per_page || 30,
      page: options?.page || 1
    })
    return data.map(this.mapRelease)
  }

  async getRelease(owner: string, repo: string, release_id: number): Promise<GitHubRelease> {
    const { data } = await this.octokit.rest.repos.getRelease({ owner, repo, release_id })
    return this.mapRelease(data)
  }

  async getLatestRelease(owner: string, repo: string): Promise<GitHubRelease> {
    const { data } = await this.octokit.rest.repos.getLatestRelease({ owner, repo })
    return this.mapRelease(data)
  }

  async createRelease(owner: string, repo: string, options: {
    tag_name: string
    name?: string
    body?: string
    draft?: boolean
    prerelease?: boolean
    target_commitish?: string
  }): Promise<GitHubRelease> {
    const { data } = await this.octokit.rest.repos.createRelease({ owner, repo, ...options })
    return this.mapRelease(data)
  }

  async deleteRelease(owner: string, repo: string, release_id: number): Promise<void> {
    await this.octokit.rest.repos.deleteRelease({ owner, repo, release_id })
  }

  // Organization Operations
  async listOrgs(): Promise<GitHubOrg[]> {
    const { data } = await this.octokit.rest.orgs.listForAuthenticatedUser()
    return data.map(this.mapOrg)
  }

  async getOrg(org: string): Promise<GitHubOrg> {
    const { data } = await this.octokit.rest.orgs.get({ org })
    return {
      id: data.id,
      login: data.login,
      name: data.name,
      description: data.description,
      url: data.url,
      htmlUrl: data.html_url,
      avatarUrl: data.avatar_url,
      membersCount: data.plan?.filled_seats,
      reposCount: data.public_repos + (data.total_private_repos || 0)
    }
  }

  async listOrgRepos(org: string, options?: {
    type?: 'all' | 'public' | 'private' | 'forks' | 'sources' | 'member'
    per_page?: number
    page?: number
  }): Promise<GitHubRepo[]> {
    const { data } = await this.octokit.rest.repos.listForOrg({
      org,
      type: options?.type || 'all',
      per_page: options?.per_page || 30,
      page: options?.page || 1
    })
    return data.map(this.mapRepo)
  }

  // Search Operations
  async searchRepos(query: string, options?: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated'
    order?: 'asc' | 'desc'
    per_page?: number
    page?: number
  }): Promise<{ total: number; repos: GitHubRepo[] }> {
    const { data } = await this.octokit.rest.search.repos({
      q: query,
      sort: options?.sort,
      order: options?.order || 'desc',
      per_page: options?.per_page || 30,
      page: options?.page || 1
    })
    return {
      total: data.total_count,
      repos: data.items.map(this.mapRepo)
    }
  }

  async searchIssues(query: string, options?: {
    sort?: 'comments' | 'reactions' | 'created' | 'updated'
    order?: 'asc' | 'desc'
    per_page?: number
    page?: number
  }): Promise<{ total: number; issues: GitHubIssue[] }> {
    const { data } = await this.octokit.rest.search.issuesAndPullRequests({
      q: query + ' is:issue',
      sort: options?.sort,
      order: options?.order || 'desc',
      per_page: options?.per_page || 30,
      page: options?.page || 1
    })
    return {
      total: data.total_count,
      issues: data.items.map(this.mapIssue)
    }
  }

  // Mapper functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRepo = (data: any): GitHubRepo => ({
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    private: data.private,
    fork: data.fork,
    url: data.url,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
    sshUrl: data.ssh_url,
    defaultBranch: data.default_branch,
    language: data.language,
    stargazersCount: data.stargazers_count,
    forksCount: data.forks_count,
    openIssuesCount: data.open_issues_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    pushedAt: data.pushed_at,
    owner: {
      login: data.owner.login,
      avatarUrl: data.owner.avatar_url
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapIssue = (data: any): GitHubIssue => ({
    id: data.id,
    number: data.number,
    title: data.title,
    body: data.body,
    state: data.state,
    url: data.url,
    htmlUrl: data.html_url,
    user: {
      login: data.user.login,
      avatarUrl: data.user.avatar_url
    },
    labels: data.labels.map((l: { name: string; color: string }) => ({ name: l.name, color: l.color })),
    assignees: data.assignees.map((a: { login: string }) => ({ login: a.login })),
    milestone: data.milestone ? { title: data.milestone.title, number: data.milestone.number } : null,
    comments: data.comments,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    closedAt: data.closed_at
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPullRequest = (data: any): GitHubPullRequest => ({
    id: data.id,
    number: data.number,
    title: data.title,
    body: data.body,
    state: data.merged ? 'merged' : data.state,
    url: data.url,
    htmlUrl: data.html_url,
    diffUrl: data.diff_url,
    head: {
      ref: data.head.ref,
      sha: data.head.sha,
      repo: {
        fullName: data.head.repo?.full_name || ''
      }
    },
    base: {
      ref: data.base.ref,
      sha: data.base.sha
    },
    user: {
      login: data.user.login,
      avatarUrl: data.user.avatar_url
    },
    draft: data.draft,
    merged: data.merged || false,
    mergeable: data.mergeable,
    mergedAt: data.merged_at,
    comments: data.comments || 0,
    reviewComments: data.review_comments || 0,
    commits: data.commits || 0,
    additions: data.additions || 0,
    deletions: data.deletions || 0,
    changedFiles: data.changed_files || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapWorkflow = (data: any): GitHubWorkflow => ({
    id: data.id,
    name: data.name,
    path: data.path,
    state: data.state,
    url: data.url,
    htmlUrl: data.html_url,
    badgeUrl: data.badge_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapWorkflowRun = (data: any): GitHubWorkflowRun => ({
    id: data.id,
    name: data.name,
    status: data.status,
    conclusion: data.conclusion,
    workflowId: data.workflow_id,
    url: data.url,
    htmlUrl: data.html_url,
    headBranch: data.head_branch,
    headSha: data.head_sha,
    event: data.event,
    runNumber: data.run_number,
    runAttempt: data.run_attempt,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    runStartedAt: data.run_started_at
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapGist = (data: any): GitHubGist => ({
    id: data.id,
    url: data.url,
    htmlUrl: data.html_url,
    description: data.description,
    public: data.public,
    files: Object.fromEntries(
      Object.entries(data.files).map(([key, file]: [string, unknown]) => {
        const f = file as { filename: string; type: string; language: string | null; raw_url: string; size: number; content?: string }
        return [key, {
          filename: f.filename,
          type: f.type,
          language: f.language,
          rawUrl: f.raw_url,
          size: f.size,
          content: f.content
        }]
      })
    ),
    owner: {
      login: data.owner.login,
      avatarUrl: data.owner.avatar_url
    },
    comments: data.comments,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRelease = (data: any): GitHubRelease => ({
    id: data.id,
    tagName: data.tag_name,
    name: data.name,
    body: data.body,
    draft: data.draft,
    prerelease: data.prerelease,
    url: data.url,
    htmlUrl: data.html_url,
    tarballUrl: data.tarball_url,
    zipballUrl: data.zipball_url,
    author: {
      login: data.author.login,
      avatarUrl: data.author.avatar_url
    },
    assets: data.assets.map((a: { id: number; name: string; size: number; download_count: number; browser_download_url: string }) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      downloadCount: a.download_count,
      browserDownloadUrl: a.browser_download_url
    })),
    createdAt: data.created_at,
    publishedAt: data.published_at
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapOrg = (data: any): GitHubOrg => ({
    id: data.id,
    login: data.login,
    name: data.name || null,
    description: data.description || null,
    url: data.url,
    htmlUrl: data.html_url || `https://github.com/${data.login}`,
    avatarUrl: data.avatar_url
  })
}
