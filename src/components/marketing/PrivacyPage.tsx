import React from 'react';
import LegalPage from './LegalPage';

/**
 * Declaração de Privacidade. Reflete o comportamento real de autenticação/sessão do app
 * (ver services/api/sessionService.ts e server/) — não descreve dados que não coletamos.
 */
const PrivacyPage: React.FC = () => {
  return (
    <LegalPage title="Declaração de Privacidade" updatedAt="2026-08-13">
      <section>
        <h2>Visão geral</h2>
        <p>
          O LayoutParser é uma ferramenta interna da NDD. Esta declaração explica quais dados
          coletamos ao autenticar, ao processar documentos e ao registrar logs, e como esses dados
          são tratados.
        </p>
      </section>

      <section>
        <h2>Dados coletados no login</h2>
        <p>
          O login usa OpenID Connect. Com a Microsoft (Entra ID) ou com o Google, solicitamos apenas
          os escopos <code>openid</code>, <code>profile</code> e <code>email</code> — o suficiente
          para identificar quem você é (nome e e-mail). Não solicitamos acesso ao Microsoft Graph
          nem a APIs do Google além desses três escopos básicos, e nenhum token de acesso ao Google
          ou à Microsoft é retido pelo backend.
        </p>
      </section>

      <section>
        <h2>Dados de documento</h2>
        <p>
          O arquivo TXT e o layout XML (quando enviado) são processados exclusivamente para gerar o
          mapeamento estrutural e, quando solicitado, a transformação correspondente. Esse conteúdo
          não é usado para nenhuma outra finalidade nem compartilhado fora do fluxo de
          processamento.
        </p>
      </section>

      <section>
        <h2>Logs</h2>
        <p>
          Registramos um identificador de correlação (Correlation ID) por requisição para
          diagnóstico técnico. Os logs não incluem o conteúdo dos documentos enviados.
        </p>
      </section>

      <section>
        <h2>Retenção</h2>
        <p>
          A sessão é mantida no servidor (BFF); nenhum token de atualização (refresh token) é retido
          pelo backend do LayoutParser além do necessário para a sessão ativa.
        </p>
      </section>

      <section>
        <h2>Compartilhamento</h2>
        <p>Não compartilhamos seus dados com terceiros.</p>
      </section>

      <section>
        <h2>Segurança</h2>
        <p>
          Toda comunicação ocorre via HTTPS. A autenticação usa OpenID Connect com PKCE, o que reduz
          o risco de interceptação do código de autorização.
        </p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>
          Você pode solicitar informações sobre os dados de identidade associados à sua conta ou
          pedir o encerramento da sua sessão a qualquer momento, saindo pelo botão "Sair" da
          aplicação.
        </p>
      </section>

      <section>
        <h2>Mudanças nesta declaração</h2>
        <p>
          Esta declaração pode ser atualizada conforme a aplicação evolui. A data de "última
          atualização" no topo desta página reflete a versão vigente.
        </p>
      </section>

      <section>
        <h2>Contato</h2>
        <p>
          Dúvidas sobre privacidade podem ser enviadas para{' '}
          <span className="legal-placeholder">[e-mail de contato]</span>.
        </p>
      </section>
    </LegalPage>
  );
};

export default PrivacyPage;
