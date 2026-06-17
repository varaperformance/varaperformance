import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHUNK_RELOAD_KEY = 'vara.chunk-reload-attempted';

function isChunkLoadFailure(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('ChunkLoadError')
  );
}

interface Props {
  children: ReactNode;
  /** Label shown in the error card, e.g. "Workouts" */
  section?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Lightweight error boundary intended for wrapping route sections or feature
 * areas.  Unlike the root AppErrorBoundary this renders *inline* so the rest
 * of the app (sidebar, nav, etc.) stays functional.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error(
      `[RouteErrorBoundary:${this.props.section ?? 'unknown'}]`,
      error,
      info,
    );

    if (
      isChunkLoadFailure(error.message || '') &&
      window.sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1'
    ) {
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
      window.location.reload();
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-base font-semibold">
              {this.props.section
                ? `${this.props.section} failed to load`
                : 'Section failed to load'}
            </h2>
          </div>
          <p className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {this.state.errorMessage}
          </p>
          <Button size="sm" onClick={this.handleRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }
}
