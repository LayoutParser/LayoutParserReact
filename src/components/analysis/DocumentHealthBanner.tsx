import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { describeValidationErrorTarget, resolveDocumentHealth } from '../../utils/documentHealth';
import './DocumentHealthBanner.css';

/**
 * Banner do terceiro estado do parse: HTTP 200 com o documento renderizável, porém COM DEFEITO
 * (spec "Taxonomia de falha do parse" §2.1). Este é o caso que mais importa ao usuário — é
 * onde ele vê ONDE está o problema no arquivo dele, com o documento na tela logo abaixo.
 *
 * Dois cuidados que motivaram extrair isto do FieldDisplay:
 *  1. antes o aviso só aparecia se `validationWarning` viesse preenchido; com `validationErrors`
 *     e sem `validationWarning` o usuário via linha vermelha sem nenhuma explicação. Agora quem
 *     decide é `resolveDocumentHealth`, e o texto do back-end é complemento, não pré-requisito.
 *  2. a precisão do apontamento acompanha o payload, na hierarquia campo → registro →
 *     linha/posição (ver `describeValidationErrorTarget`). Hoje o nível que roda é o do
 *     REGISTRO: o validador nunca vê o layout, então `fieldName`/`fieldGuid` vêm sempre
 *     nulos. Nenhum texto daqui pode prometer precisão de campo com dado de segmento.
 */

/** Acima disto a lista vira ruído; o documento anotado abaixo continua sendo a fonte completa. */
const MAX_ERRORS_LISTED = 10;

const DocumentHealthBanner: React.FC = () => {
  const { parseResult } = useAppStore();

  if (!parseResult || !parseResult.success) {
    return null;
  }

  if (resolveDocumentHealth(parseResult) === 'clean') {
    return null;
  }

  const errors = parseResult.validationErrors ?? [];
  const listed = errors.slice(0, MAX_ERRORS_LISTED);
  const omitted = errors.length - listed.length;

  // O prefixo já existe no texto do back-end; o banner tem título próprio, então repetir
  // "Erro no Documento:" dentro da mensagem seria eco.
  //
  // O emoji é OPCIONAL de propósito: a API rodando hoje devolve o texto SEM o "⚠️"
  // (verificado em runtime), enquanto o código anterior só sabia remover a variante COM
  // emoji — e por isso o prefixo vazava para a tela. Casar os dois evita depender de qual
  // variante o back-end usa.
  const backendMessage = parseResult.validationWarning
    ?.replace(/^\s*(?:⚠️\s*)?Erro no Documento:\s*/, '')
    .trim();

  const summary =
    backendMessage ||
    (errors.length === 1
      ? 'O documento foi processado, mas apresenta 1 ponto com defeito.'
      : `O documento foi processado, mas apresenta ${errors.length} pontos com defeito.`);

  // Só vale avisar "não sabemos de onde vem" quando NENHUM erro listado tem identidade — nem
  // de campo, nem de registro.
  const anyIdentified = listed.some(
    error => describeValidationErrorTarget(error).identity !== 'line'
  );

  return (
    <div className="document-health-banner" role="alert">
      <div className="document-health-banner-head">
        <span className="document-health-banner-icon" aria-hidden="true">
          ⚠️
        </span>
        <strong className="document-health-banner-title">Documento processado com defeitos</strong>
      </div>

      <p className="document-health-banner-summary">{summary}</p>

      <p className="document-health-banner-scope">
        O defeito está <strong>no documento enviado</strong>, não no layout.
      </p>

      {listed.length > 0 && (
        <ul className="document-health-banner-list">
          {listed.map((error, index) => {
            const target = describeValidationErrorTarget(error);

            return (
              <li className="document-health-banner-item" key={`${error.lineIndex}-${index}`}>
                <span
                  className={`document-health-banner-target ${
                    target.identity !== 'line' ? 'document-health-banner-target--identified' : ''
                  }`}
                >
                  {target.label}
                </span>

                {error.errorMessage && (
                  <span className="document-health-banner-detail">{error.errorMessage}</span>
                )}

                {target.targetXPath && (
                  <span className="document-health-banner-xpath" title="Destino no XML de saída">
                    {target.targetXPath}
                  </span>
                )}

                {/* Identificador estável para reportar/rastrear. O `title` diz de qual
                    granularidade ele é — registro e campo não podem se confundir. */}
                {target.fieldGuid && (
                  <span className="document-health-banner-guid" title="Identificador do campo">
                    {target.fieldGuid}
                  </span>
                )}

                {!target.fieldGuid && target.recordGuid && (
                  <span className="document-health-banner-guid" title="Identificador do registro">
                    {target.recordGuid}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {omitted > 0 && (
        <p className="document-health-banner-note">
          e mais {omitted} {omitted === 1 ? 'ocorrência' : 'ocorrências'} no documento.
        </p>
      )}

      {!anyIdentified && listed.length > 0 && (
        <p className="document-health-banner-note">
          Indicação por linha e posição — o registro de origem não foi informado para este
          documento.
        </p>
      )}
    </div>
  );
};

export default DocumentHealthBanner;
