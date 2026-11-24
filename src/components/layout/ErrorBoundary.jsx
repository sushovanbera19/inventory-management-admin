// Catches a crash in a page so the rest of the app keeps working, and offers a reload.
import { Component } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(previousProps) {
    // Navigating to another page clears the error.
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="grid min-h-[60dvh] place-items-center px-4">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger-fg">
            <TriangleAlert className="size-6" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-fg">This page ran into a problem</h1>
          <p className="mt-2 text-sm text-fg-muted">Something unexpected happened while showing this page. Reloading usually fixes it.</p>
          <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-fg-subtle">{String(this.state.error?.message ?? this.state.error)}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-brand px-4 text-sm font-medium text-white shadow-glow-sm"
          >
            <RefreshCw className="size-4" />
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
