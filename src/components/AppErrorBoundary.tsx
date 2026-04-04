import { Component, ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  errorMessage: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Unknown runtime error';
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorMessage: null,
  };

  private readonly handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.setState({ errorMessage: getErrorMessage(event.reason) });
  };

  componentDidMount(): void {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount(): void {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      errorMessage: getErrorMessage(error),
    };
  }

  componentDidCatch(error: Error): void {
    console.error('App crashed with runtime error:', error);
  }

  render() {
    if (!this.state.errorMessage) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#00031a] p-4 text-white">
        <div className="mx-auto mt-12 w-full max-w-xl rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm font-black uppercase tracking-wider text-red-300">Runtime Error</p>
          <p className="mt-2 text-sm text-red-100">プレビュー中に実行エラーが発生しました。</p>
          <p className="mt-3 rounded-md bg-black/30 p-2 font-mono text-xs text-red-200">{this.state.errorMessage}</p>
        </div>
      </div>
    );
  }
}
