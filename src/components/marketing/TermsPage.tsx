import React from 'react';
import LegalPage from './LegalPage';

/**
 * Termos de Uso. Placeholders (ex.: e-mail de contato, jurisdição) estão marcados
 * explicitamente entre colchetes até que o dado real seja confirmado com a NDD.
 */
const TermsPage: React.FC = () => {
  return (
    <LegalPage title="Termos de Uso" updatedAt="2026-08-13">
      <section>
        <h2>1. Aceitação dos termos</h2>
        <p>
          Ao acessar ou usar o LayoutParser, você concorda com estes Termos de Uso. Se você não
          concordar com qualquer parte destes termos, não deverá utilizar a aplicação.
        </p>
      </section>

      <section>
        <h2>2. Descrição do serviço</h2>
        <p>
          O LayoutParser é uma ferramenta interna da NDD para análise de documentos: você envia um
          arquivo TXT posicional (opcionalmente acompanhado de um layout XML) e a aplicação gera um
          mapeamento estrutural do documento — linhas, campos, posições e validações — que pode ser
          revisado e usado como base para gerar transformações.
        </p>
      </section>

      <section>
        <h2>3. Contas e autenticação</h2>
        <p>
          O acesso é feito por meio de sua conta Microsoft (Entra ID) ou Google. Você é responsável
          por manter a confidencialidade das credenciais dessa conta; o LayoutParser não cria nem
          armazena senha própria.
        </p>
      </section>

      <section>
        <h2>4. Uso aceitável</h2>
        <ul>
          <li>Não envie documentos que você não tem autorização para processar.</li>
          <li>Não tente contornar limites de tamanho de upload ou de taxa de requisições.</li>
          <li>
            Não utilize a aplicação para fins diferentes de análise e transformação de layout.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Dados do usuário</h2>
        <p>
          O conteúdo dos documentos enviados é processado apenas para gerar o mapeamento estrutural
          solicitado. Consulte a <a href="/privacy">Declaração de Privacidade</a> para detalhes
          sobre coleta, retenção e compartilhamento de dados.
        </p>
      </section>

      <section>
        <h2>6. Disponibilidade e mudanças no serviço</h2>
        <p>
          O LayoutParser é oferecido como está, podendo passar por manutenções, alterações de
          funcionalidade ou indisponibilidade temporária sem aviso prévio.
        </p>
      </section>

      <section>
        <h2>7. Isenção de garantias</h2>
        <p>
          O serviço é fornecido sem garantias de qualquer tipo, expressas ou implícitas, incluindo —
          mas não se limitando a — adequação a um propósito específico ou ausência de erros no
          mapeamento gerado.
        </p>
      </section>

      <section>
        <h2>8. Limitação de responsabilidade</h2>
        <p>
          A NDD não se responsabiliza por danos indiretos, incidentais ou consequenciais decorrentes
          do uso ou da impossibilidade de uso do LayoutParser.
        </p>
      </section>

      <section>
        <h2>9. Rescisão</h2>
        <p>
          O acesso pode ser suspenso ou encerrado a qualquer momento, em particular em caso de uso
          que viole estes termos.
        </p>
      </section>

      <section>
        <h2>10. Lei aplicável</h2>
        <p>
          Estes termos são regidos pelas leis do Brasil, com foro eleito em{' '}
          <span className="legal-placeholder">[jurisdição]</span>.
        </p>
      </section>

      <section>
        <h2>11. Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{' '}
          <span className="legal-placeholder">[e-mail de contato]</span>.
        </p>
      </section>
    </LegalPage>
  );
};

export default TermsPage;
