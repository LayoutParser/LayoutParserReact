import { useState } from 'react';
import { parseService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import LayoutSearch from './LayoutSearch';
import type { ParseRequest } from '../../types/api';
import './UploadSection.css';

const UploadSection = () => {
  const [txtFile, setTxtFile] = useState<File | null>(null);
  
  const {
    isUploading,
    uploadError,
    selectedLayout,
    setUploading,
    setUploadError,
    setParseResult,
    setTxtContent,
    setFields,
  } = useAppStore();

  const handleTxtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTxtFile(file);
      setUploadError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLayout) {
      setUploadError('Por favor, selecione um layout do banco de dados primeiro');
      return;
    }

    if (!txtFile) {
      setUploadError('Por favor, selecione o arquivo de dados (TXT/MQSeries/IDoc)');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Criar um arquivo virtual com o layout selecionado
      // O layout vem do Redis com decryptedContent ou valueContent
      const layoutContent = selectedLayout.decryptedContent || (selectedLayout as any).valueContent;
      
      if (!layoutContent) {
        throw new Error('Layout não encontrado no Redis. Por favor, atualize o cache ou busque layouts do banco.');
      }
      
      const blob = new Blob([layoutContent], { type: 'application/xml' });
      const layoutFile = new File([blob], `${selectedLayout.name || 'layout'}.xml`, { type: 'application/xml' });

      const request: ParseRequest = {
        layoutFile,
        txtFile,
        layoutName: selectedLayout.name,
      };

      const result = await parseService.parseFiles(request);
      
      // Atualizar estado
      setParseResult(result);
      if (result.text) {
        setTxtContent(result.text);
      }
      if (result.fields) {
        setFields(result.fields);
      }

      console.log('✅ Parsing concluído:', result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setUploadError(errorMessage);
      console.error('❌ Erro no parsing:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-section">
      <div className="upload-card">
        <h2>Upload e Processamento</h2>
        <p className="upload-description">
          Selecione um layout do banco de dados e o arquivo de dados (TXT/MQSeries/IDoc)
        </p>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* Combobox de Layouts */}
          <LayoutSearch />

          {/* Upload de Arquivo de Dados */}
          <div className="file-input-group">
            <label htmlFor="txtFile" className="file-label">
              <span className="file-label-text">Arquivo de Dados (TXT/MQSeries/IDoc)</span>
              <input
                type="file"
                id="txtFile"
                accept=".txt,.mq_series,.idoc"
                onChange={handleTxtFileChange}
                disabled={isUploading}
                className="file-input"
              />
              {txtFile && (
                <span className="file-name">✓ {txtFile.name}</span>
              )}
            </label>
          </div>

          {uploadError && (
            <div className="error-message">
              ❌ {uploadError}
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || !selectedLayout || !txtFile}
            className="submit-button"
          >
            {isUploading ? 'Processando...' : 'Processar & Analisar Documento'}
          </button>
        </form>
      </div>

      <ParseResultDisplay />
    </div>
  );
};

const ParseResultDisplay = () => {
  const { parseResult, txtContent, fields } = useAppStore();

  if (!parseResult) {
    return null;
  }

  return (
    <div className="result-card">
      <h3>Resultado do Parsing</h3>
      
      <div className="result-info">
        <div className="info-item">
          <strong>Status:</strong> {parseResult.success ? '✅ Sucesso' : '❌ Erro'}
        </div>
        {parseResult.detectedType && (
          <div className="info-item">
            <strong>Tipo Detectado:</strong> {parseResult.detectedType}
          </div>
        )}
        {txtContent && (
          <div className="info-item">
            <strong>Conteúdo:</strong> {txtContent.length} caracteres
          </div>
        )}
        {fields && (
          <div className="info-item">
            <strong>Campos:</strong> {fields.length} campos processados
          </div>
        )}
      </div>

      {parseResult.errors && parseResult.errors.length > 0 && (
        <div className="errors-section">
          <h4>Erros:</h4>
          <ul>
            {parseResult.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UploadSection;

