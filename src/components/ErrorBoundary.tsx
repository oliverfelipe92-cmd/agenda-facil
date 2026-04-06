import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      let isOffline = false;

      try {
        const parsedError = JSON.parse(this.state.error?.message || '{}');
        if (parsedError.error?.includes('unavailable') || parsedError.error?.includes('offline')) {
          errorMessage = 'Não foi possível conectar ao banco de dados. Verifique sua conexão.';
          isOffline = true;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-200"
            >
              <RefreshCcw className="w-5 h-5" />
              {isOffline ? 'Tentar Reconectar' : 'Recarregar Página'}
            </button>
            {isOffline && (
              <p className="mt-4 text-xs text-gray-400">
                Dica: Se o problema persistir, tente recarregar a página em alguns instantes.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
