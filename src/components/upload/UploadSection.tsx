import { useState } from 'react';
import { parseService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import type { ParseRequest } from '../../types/api';
import './UploadSection.css';

const UploadSection = () => {
  const [layoutFile, setLayoutFile] = useState<File | null>(null);
  const [txtFile, setTxtFile] = useState<File | null>(null);
  
  const {
    isUploading,
    uploadError,
    setUploading,
    setUploadError,
    setParseResult,
    setTxtContent,
    setFields,
  } = useAppStore();

  const handleLayoutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLayoutFile(file);
      setUploadError(null);
    }
  };

  const handleTxtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTxtFile(file);
      setUploadError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!layoutFile || !txtFile) {
      setUploadError('Por favor, selecione ambos os arquivos (Layout e TXT)');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const request: ParseRequest = {
        layoutFile,
        txtFile,
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
        <h2>Upload de Arquivos</h2>
        <p className="upload-description">
          Selecione o arquivo de layout (XML) e o arquivo de dados (TXT/MQSeries/IDoc)
        </p>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-group">
            <label htmlFor="layoutFile" className="file-label">
              <span className="file-label-text">Arquivo de Layout (XML)</span>
              <input
                type="file"
                id="layoutFile"
                accept=".xml"
                onChange={handleLayoutFileChange}
                disabled={isUploading}
                className="file-input"
              />
              {layoutFile && (
                <span className="file-name">✓ {layoutFile.name}</span>
              )}
            </label>
          </div>

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
            disabled={isUploading || !layoutFile || !txtFile}
            className="submit-button"
          >
            {isUploading ? 'Processando...' : 'Processar Arquivos'}
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

