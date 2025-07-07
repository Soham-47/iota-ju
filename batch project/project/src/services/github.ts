export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
  public_repos: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  open_issues_count: number;
  language: string;
  updated_at: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  topics?: string[];
  has_issues: boolean;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  user: {
    login: string;
    avatar_url: string;
  };
  repository_url: string;
  html_url: string;
  comments: number;
  assignee: any;
}

class GitHubService {
  private baseUrl = 'https://api.github.com';
  private token: string | null = null;

  // Beginner-friendly labels to look for
  private beginnerLabels = [
    'good first issue',
    'good-first-issue',
    'beginner',
    'beginner-friendly',
    'easy',
    'starter',
    'newcomer',
    'first-timers-only',
    'up-for-grabs',
    'help wanted',
    'documentation',
    'docs',
    'typo',
    'enhancement',
    'feature',
    'hacktoberfest',
    'low-hanging-fruit',
    'easy-fix',
    'junior-job'
  ];

  // Popular beginner-friendly repositories
  private beginnerRepos = [
    'freeCodeCamp/freeCodeCamp',
    'microsoft/vscode',
    'facebook/react',
    'vuejs/vue',
    'angular/angular',
    'nodejs/node',
    'tensorflow/tensorflow',
    'kubernetes/kubernetes',
    'elastic/elasticsearch',
    'atom/atom',
    'rails/rails',
    'django/django',
    'laravel/laravel',
    'symfony/symfony',
    'spring-projects/spring-boot',
    'apache/kafka',
    'mozilla/pdf.js',
    'gatsbyjs/gatsby',
    'nuxt/nuxt.js',
    'nestjs/nest',
    'expressjs/express',
    'socketio/socket.io',
    'lodash/lodash',
    'moment/moment',
    'chartjs/Chart.js',
    'prettier/prettier',
    'eslint/eslint',
    'webpack/webpack',
    'babel/babel',
    'storybookjs/storybook',
    'jestjs/jest',
    'cypress-io/cypress',
    'puppeteer/puppeteer',
    'microsoft/TypeScript',
    'golang/go',
    'rust-lang/rust',
    'python/cpython',
    'openjdk/jdk',
    'dotnet/core',
    'flutter/flutter',
    'ionic-team/ionic-framework',
    'apache/spark',
    'pandas-dev/pandas',
    'numpy/numpy',
    'scikit-learn/scikit-learn',
    'jupyter/notebook',
    'home-assistant/core',
    'ansible/ansible',
    'docker/docker-ce',
    'grafana/grafana',
    'prometheus/prometheus',
    'hashicorp/terraform'
  ];

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('github_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('github_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('github_token');
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getCurrentUser(): Promise<GitHubUser> {
    return this.makeRequest<GitHubUser>('/user');
  }

  async getUserRepositories(username?: string): Promise<GitHubRepository[]> {
    const endpoint = username ? `/users/${username}/repos` : '/user/repos';
    const params = new URLSearchParams({
      sort: 'updated',
      per_page: '100',
    });
    
    return this.makeRequest<GitHubRepository[]>(`${endpoint}?${params}`);
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.makeRequest<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  async getRepositoryIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubIssue[]> {
    const params = new URLSearchParams({
      state,
      sort: 'updated',
      per_page: '100',
    });
    
    return this.makeRequest<GitHubIssue[]>(`/repos/${owner}/${repo}/issues?${params}`);
  }

  async searchRepositories(query: string): Promise<{ items: GitHubRepository[] }> {
    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: '20',
    });
    
    return this.makeRequest<{ items: GitHubRepository[] }>(`/search/repositories?${params}`);
  }

  // Search for beginner-friendly issues across GitHub
  async searchBeginnerIssues(language?: string, label?: string): Promise<{ items: GitHubIssue[] }> {
    let query = 'is:issue is:open';
    
    if (label) {
      query += ` label:"${label}"`;
    } else {
      // Default to good first issue
      query += ' label:"good first issue"';
    }
    
    if (language) {
      query += ` language:${language}`;
    }
    
    // Add additional filters for quality
    query += ' comments:>=1 comments:<=10'; // Issues with some discussion but not overwhelming
    
    const params = new URLSearchParams({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: '50',
    });
    
    return this.makeRequest<{ items: GitHubIssue[] }>(`/search/issues?${params}`);
  }

  // Get beginner-friendly repositories
  async getBeginnerFriendlyRepos(): Promise<GitHubRepository[]> {
    const repos: GitHubRepository[] = [];
    
    // Fetch a subset of popular beginner-friendly repos
    const repoSubset = this.beginnerRepos.slice(0, 20);
    
    for (const repoPath of repoSubset) {
      try {
        const [owner, repo] = repoPath.split('/');
        const repository = await this.getRepository(owner, repo);
        repos.push(repository);
      } catch (error) {
        console.warn(`Failed to fetch ${repoPath}:`, error);
      }
    }
    
    return repos;
  }

  // Search repositories with beginner-friendly topics
  async searchBeginnerRepos(language?: string): Promise<{ items: GitHubRepository[] }> {
    let query = 'topic:good-first-issue OR topic:beginner-friendly OR topic:hacktoberfest';
    
    if (language) {
      query += ` language:${language}`;
    }
    
    query += ' stars:>100'; // Ensure repos have some community
    
    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: '30',
    });
    
    return this.makeRequest<{ items: GitHubRepository[] }>(`/search/repositories?${params}`);
  }

  // GitHub OAuth flow helpers
  getAuthUrl(): string {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new Error('GitHub Client ID not configured');
    }
    
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'repo,user:email',
      redirect_uri: window.location.origin + '/auth/callback',
    });
    
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    // This would typically be done on your backend for security
    // For demo purposes, we'll simulate this
    throw new Error('OAuth token exchange must be implemented on your backend');
  }

  // Utility methods
  parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  }

  categorizeIssue(issue: GitHubIssue): string {
    const title = issue.title.toLowerCase();
    const labels = issue.labels.map(l => l.name.toLowerCase());
    
    // Check for beginner-friendly labels first
    if (labels.some(l => this.beginnerLabels.some(bl => l.includes(bl)))) {
      if (labels.some(l => l.includes('good first issue') || l.includes('good-first-issue'))) {
        return 'good-first-issue';
      }
      if (labels.some(l => l.includes('documentation') || l.includes('docs'))) {
        return 'documentation';
      }
      if (labels.some(l => l.includes('beginner') || l.includes('easy'))) {
        return 'beginner-friendly';
      }
      if (labels.some(l => l.includes('help wanted') || l.includes('up-for-grabs'))) {
        return 'help-wanted';
      }
    }
    
    // Standard categorization
    if (labels.some(l => l.includes('security') || l.includes('vulnerability'))) {
      return 'security';
    }
    if (labels.some(l => l.includes('bug') || l.includes('fix')) || title.includes('bug') || title.includes('error')) {
      return 'bug';
    }
    if (labels.some(l => l.includes('feature') || l.includes('enhancement')) || title.includes('feature')) {
      return 'enhancement';
    }
    if (labels.some(l => l.includes('typo') || l.includes('spelling'))) {
      return 'typo';
    }
    
    return 'other';
  }

  getPriorityFromIssue(issue: GitHubIssue): 'low' | 'medium' | 'high' {
    const labels = issue.labels.map(l => l.name.toLowerCase());
    
    // Beginner issues are typically low priority for learning
    if (labels.some(l => this.beginnerLabels.some(bl => l.includes(bl)))) {
      return 'low';
    }
    
    if (labels.some(l => l.includes('critical') || l.includes('urgent') || l.includes('high'))) {
      return 'high';
    }
    if (labels.some(l => l.includes('medium') || l.includes('important'))) {
      return 'medium';
    }
    
    return 'low';
  }

  getDifficultyFromIssue(issue: GitHubIssue): 'beginner' | 'intermediate' | 'advanced' {
    const labels = issue.labels.map(l => l.name.toLowerCase());
    const title = issue.title.toLowerCase();
    
    // Check for explicit beginner indicators
    if (labels.some(l => 
      l.includes('good first issue') || 
      l.includes('beginner') || 
      l.includes('easy') || 
      l.includes('starter') ||
      l.includes('first-timers-only') ||
      l.includes('documentation') ||
      l.includes('typo')
    )) {
      return 'beginner';
    }
    
    // Check for advanced indicators
    if (labels.some(l => 
      l.includes('advanced') || 
      l.includes('complex') || 
      l.includes('architecture') ||
      l.includes('performance') ||
      l.includes('security')
    ) || title.includes('refactor') || title.includes('optimize')) {
      return 'advanced';
    }
    
    return 'intermediate';
  }

  getBeginnerLabels(): string[] {
    return this.beginnerLabels;
  }

  getPopularBeginnerRepos(): string[] {
    return this.beginnerRepos;
  }
}

export const githubService = new GitHubService();