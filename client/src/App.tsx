import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PageShell } from './components/layout/PageShell'

// Lazy-loaded pages — each implemented by its corresponding worker unit
const Projects      = lazy(() => import('./pages/Projects'))
const GameDetail    = lazy(() => import('./pages/GameDetail'))
const LiveRun       = lazy(() => import('./pages/LiveRun'))
const LiveEdit      = lazy(() => import('./pages/LiveEdit'))
const Prompt        = lazy(() => import('./pages/Prompt'))
const RepoExplorer  = lazy(() => import('./pages/RepoExplorer'))
const Schedule      = lazy(() => import('./pages/Schedule'))
const Config        = lazy(() => import('./pages/Config'))

function Loading() {
  return (
    <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
      Loading...
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <PageShell>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/new" element={<Prompt />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:game" element={<GameDetail />} />
            <Route path="/projects/:game/run" element={<LiveRun />} />
            <Route path="/projects/:game/edit" element={<LiveEdit />} />
            <Route path="/projects/:game/repo" element={<RepoExplorer />} />
            <Route path="/repo" element={<RepoExplorer />} />
            <Route path="/repo/*" element={<RepoExplorer />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/config" element={<Config />} />
          </Routes>
        </Suspense>
      </PageShell>
    </BrowserRouter>
  )
}
