import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import { transformationService } from '../../services/api/transformationService';
import './XmlTransformationDisplay.css';

/**
 * Formata XML para leitura, sem lib externa: insere quebra de linha e indentação a partir
 * da estrutura de tags. É só um auxílio visual — não altera o XML retornado pela API, apenas
 * a apresentação em tela. Se o conteúdo tiver CDATA (não coberto pela lógica de indentação)
 * ou algo inesperado acontecer, devolve o texto original sem formatar: mostrar cru é melhor
 * do que corromper a leitura.
 */
const formatXmlForDisplay = (xml: string): string => {
  if (!xml || xml.includes('<![CDATA[')) {
    return xml;
  }

  try {
    const withLineBreaks = xml.replace(/>\s*</g, '><').replace(/></g, '>\n<');
    const indentUnit = '  ';
    let indentLevel = 0;

    return withLineBreaks
      .split('\n')
      .map(rawLine => {
        const line = rawLine.trim();
        if (!line) return '';

        const isClosingTag = /^<\/[^>]+>$/.test(line);
        const isSelfClosingOrDirective =
          /\/>$/.test(line) || /^<\?.*\?>$/.test(line) || /^<!--.*-->$/.test(line);
        const isOpenAndCloseSameLine = /^<([^\s/>]+)[^>]*>.*<\/\1>$/.test(line);

        if (isClosingTag && indentLevel > 0) {
          indentLevel -= 1;
        }

        const indented = indentUnit.repeat(indentLevel) + line;

        if (!isClosingTag && !isSelfClosingOrDirective && !isOpenAndCloseSameLine) {
          indentLevel += 1;
        }

        return indented;
      })
      .join('\n');
  } catch {
    return xml;
  }
};

/**
 * Exibe o resultado da "XML Transformação Final": o back-end valida o input e devolve o
 * XML transformado, este componente só dispara a chamada e renderiza o retorno (front é
 * só apresentação — nenhuma transformação roda aqui).
 *
 * Disparo é via botão explícito (não automático ao abrir a aba), já que a transformação
 * pode ser custosa no back-end.
 */
const XmlTransformationDisplay: React.FC = () => {
  const { selectedLayout, txtContent } = useAppStore();
  const {
    isExecuting,
    executionError,
    transformationResult,
    setExecuting,
    setExecutionError,
    setTransformationResult,
  } = useTransformationStore();

  // Formatação é recalculada só quando o resultado muda (evita reformatar a cada render).
  const formattedXml = useMemo(() => {
    if (transformationResult && transformationResult.success) {
      return formatXmlForDisplay(transformationResult.transformedXml);
    }
    return '';
  }, [transformationResult]);

  const handleGenerate = async () => {
    if (!selectedLayout || !txtContent) {
      setExecutionError('Documento processado ou layout selecionado não encontrado.');
      return;
    }

    setExecuting(true);
    setExecutionError(null);

    try {
      const result = await transformationService.executeTransformation({
        inputContent: txtContent,
        layoutName: selectedLayout.name,
        sourceDocumentType: '',
        targetDocumentType: '',
        expectedOutput: '',
        validate: true,
      });

      setTransformationResult(result);

      if (!result.success) {
        setExecutionError(result.errors[0] || 'Erro ao gerar transformação XML.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido ao gerar transformação XML';
      setExecutionError(message);
      setTransformationResult(null);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="xml-transformation-display">
      <div className="xml-transformation-actions">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isExecuting}
          aria-busy={isExecuting}
          className="xml-transformation-generate-btn"
        >
          {isExecuting ? 'Gerando transformação...' : 'Gerar Transformação XML'}
        </button>
      </div>

      {executionError && (
        <div className="xml-transformation-error" role="alert">
          ❌ {executionError}
        </div>
      )}

      {transformationResult && transformationResult.success && (
        <div className="xml-transformation-result">
          <h3>XML Transformado</h3>
          {/* tabIndex + role="region" permitem rolar o bloco via teclado (Tab + setas/Page
              Down) — sem isso, quem não usa mouse não conseguia rolar um XML longo. */}
          <pre
            className="xml-transformation-content"
            tabIndex={0}
            role="region"
            aria-label="Conteúdo XML transformado"
          >
            {formattedXml}
          </pre>
        </div>
      )}

      {!transformationResult && !executionError && !isExecuting && (
        <p className="xml-transformation-placeholder">
          Clique em &quot;Gerar Transformação XML&quot; para validar o documento e gerar a
          transformação final.
        </p>
      )}
    </div>
  );
};

export default XmlTransformationDisplay;
