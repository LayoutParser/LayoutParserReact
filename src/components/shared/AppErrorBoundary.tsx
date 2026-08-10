import React from 'react';
import { logService } from '../../services/api/logService';
import { createCorrelationId } from '../../utils/correlation';
import './AppErrorBoundary.css';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  correlationId?: string;
}

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true, correlationId: createCorrelationId() };
  }

  componentDidCatch(error: Error): void {
    logService.error('Falha inesperada na interface do LayoutParser', {
      correlationId: this.state.correlationId,
      errorName: error.name,
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="app-fatal-error" role="alert" aria-live="assertive">
        <section className="app-fatal-error__card">
          <p className="app-fatal-error__eyebrow">Falha inesperada</p>
          <h1>Não foi possível continuar nesta tela.</h1>
          <p>
            O conteúdo do documento não foi enviado no diagnóstico. Recarregue a aplicação e tente
            novamente.
          </p>
          {this.state.correlationId && (
            <p className="app-fatal-error__correlation">
              Código para suporte: <code>{this.state.correlationId}</code>
            </p>
          )}
          <button type="button" onClick={this.handleReload}>
            Recarregar aplicação
          </button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
