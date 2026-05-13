// Route path constants — use these instead of hard-coding strings
export const ROUTES = {
  home:       '/',
  new:        '/new',
  projects:   '/projects',
  game:       (slug: string) => `/projects/${slug}`,
  run:        (slug: string) => `/projects/${slug}/run`,
  edit:       (slug: string) => `/projects/${slug}/edit`,
  gameRepo:   (slug: string) => `/projects/${slug}/repo`,
  repo:       '/repo',
  repoPath:   (path: string) => `/repo/${path}`,
  schedule:   '/schedule',
  config:     '/config',
} as const
