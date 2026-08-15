import React from 'react';
import { Link } from 'react-router-dom';
import { authenticationMessages } from '../auth/authenticationMessages';
import './HomePage.css';

interface HomePageProps {
  returnTo: string;
  authError?: string | null;
}

/**
 * Home pública do LayoutParser, exibida em "/" apenas para visitantes sem sessão.
 * Usuários autenticados nunca veem esta página (o MainLayout redireciona para /upload).
 */
const HomePage: React.FC<HomePageProps> = ({ returnTo, authError }) => {
  const loginUrl = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  const googleLoginUrl = `/auth/google/login?returnTo=${encodeURIComponent(returnTo)}`;
  const safeAuthError = authError ? authenticationMessages[authError] : null;

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <img src="/layoutparser-mark.svg" alt="" className="home-brand-mark" />
          <span>LayoutParser</span>
        </div>
        <div className="home-header-actions">
          <a className="home-header-login" href={loginUrl}>
            Entrar
          </a>
        </div>
      </header>

      <main className="home-main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-eyebrow">Ferramenta interna NDD</p>
            <h1>Entenda a estrutura dos seus documentos antes de transformá-los</h1>
            <p className="home-hero-description">
              O LayoutParser lê um documento <strong>TXT posicional</strong> — opcionalmente
              acompanhado do layout em XML — e mapeia linhas, campos e posições numa árvore de
              estrutura navegável. A partir desse mapa, você revisa a leitura e gera as
              transformações do documento.
            </p>

            {safeAuthError && (
              <p className="home-alert" role="alert">
                {safeAuthError}
              </p>
            )}

            <div className="home-hero-actions">
              <a className="home-primary-action" href={loginUrl}>
                <span className="microsoft-symbol" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                Entrar com Microsoft
              </a>
              <a className="home-secondary-action home-google-action" href={googleLoginUrl}>
                <svg className="google-symbol" aria-hidden="true" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
                  />
                </svg>
                Entrar com Google
              </a>
            </div>
            <p className="home-privacy-note">
              Sua senha permanece com o provedor escolhido. Veja o que coletamos em nossa{' '}
              <Link to="/privacy">Declaração de Privacidade</Link>.
            </p>
          </div>

          <div className="home-hero-visual" aria-hidden="true">
            <div className="home-tree-card">
              <div className="home-tree-row home-tree-row--root">Documento</div>
              <div className="home-tree-row">↳ Segmento 001</div>
              <div className="home-tree-row home-tree-row--nested">↳ Campo: Código</div>
              <div className="home-tree-row home-tree-row--nested">↳ Campo: Data</div>
              <div className="home-tree-row">↳ Segmento 002</div>
              <div className="home-tree-row home-tree-row--nested">↳ Campo: Valor</div>
            </div>
          </div>
        </section>

        <section className="home-features">
          <h2>O que o LayoutParser faz hoje</h2>
          <div className="home-feature-grid">
            <article className="home-feature-card">
              <h3>Mapeamento estrutural</h3>
              <p>
                Envie um TXT posicional (com layout XML opcional) e receba a árvore de linhas,
                campos e posições identificados no documento.
              </p>
            </article>
            <article className="home-feature-card">
              <h3>Revisão guiada</h3>
              <p>
                Navegue pela estrutura reconhecida, confira validações e a saúde documental antes de
                seguir para a transformação.
              </p>
            </article>
            <article className="home-feature-card">
              <h3>Geração de transformações</h3>
              <p>
                A partir do mapeamento revisado, gere a transformação correspondente ao documento e
                faça o download do resultado.
              </p>
            </article>
          </div>
          <p className="home-scope-note">
            Hoje o foco é o formato TXT posicional. Suporte a outros formatos de entrada está no
            radar, mas ainda não faz parte do produto.
          </p>
        </section>

        <section className="home-roadmap">
          <h2>Para onde isso está indo</h2>
          <p>
            Estamos investindo em IA para apoiar a <strong>autoria de transformações</strong> — ou
            seja, sugerir e ajudar a construir a transformação a partir do mapeamento, não só
            exibi-lo. <strong>Isso ainda não foi construído</strong>: é uma direção de produto, não
            um recurso disponível hoje. Quando existir, aparecerá aqui como uma etapa adicional do
            fluxo, não como substituição da revisão manual.
          </p>
        </section>
      </main>

      <footer className="home-footer">
        <span>© {new Date().getFullYear()} NDD — LayoutParser (uso interno)</span>
        <nav className="home-footer-links" aria-label="Legal">
          <Link to="/terms">Termos de Uso</Link>
          <Link to="/privacy">Declaração de Privacidade</Link>
        </nav>
      </footer>
    </div>
  );
};

export default HomePage;
