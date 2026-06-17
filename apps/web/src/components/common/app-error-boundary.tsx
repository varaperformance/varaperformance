import { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHUNK_RELOAD_KEY = 'vara.chunk-reload-attempted';

function isChunkLoadFailure(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('ChunkLoadError')
  );
}

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: unknown): void {
    console.error('AppErrorBoundary caught an error', error, errorInfo);

    if (
      isChunkLoadFailure(error.message || '') &&
      window.sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1'
    ) {
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
      window.location.reload();
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Page failed to load</h1>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            Something interrupted route loading. Reload the page to recover.
          </p>
          <p className="mb-5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {this.state.errorMessage}
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={this.handleReload}>Reload</Button>
            <Button variant="outline" onClick={this.handleGoHome}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
