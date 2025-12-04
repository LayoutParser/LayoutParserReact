import { useState } from 'react';
import { parseService } from '../../services/api';
import { layoutService } from '../../services/api/layoutService';
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
    setSelectedLayout,
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
      // Verificar se o layout tem decryptedContent
      // Se não tiver (veio do cache do navegador), buscar da API
      let layoutContent = selectedLayout.decryptedContent || (selectedLayout as any).valueContent;
      let layoutToUse = selectedLayout;
      
      if (!layoutContent) {
        // Layout veio do cache sem conteúdo, buscar da API
        console.log('ℹ️ Layout sem decryptedContent, buscando da API...');
        setUploadError('Buscando layout completo da API...');
        
        try {
          const result = await layoutService.searchLayouts();
          if (result.success && result.layouts) {
            const fullLayout = result.layouts.find(l => 
              l.layoutGuid === selectedLayout.layoutGuid || 
              l.name === selectedLayout.name
            );
            
            if (fullLayout && (fullLayout.decryptedContent || (fullLayout as any).valueContent)) {
              layoutContent = fullLayout.decryptedContent || (fullLayout as any).valueContent;
              layoutToUse = fullLayout;
              // Atualizar o layout selecionado com o conteúdo completo
              setSelectedLayout(fullLayout);
              console.log('✅ Layout completo carregado da API');
            } else {
              throw new Error('Layout não encontrado no Redis. Por favor, atualize o cache ou busque layouts do banco.');
            }
          } else {
            throw new Error('Erro ao buscar layout da API. Por favor, atualize o cache.');
          }
        } catch (apiError) {
          throw new Error(`Erro ao buscar layout da API: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`);
        }
      }
      
      if (!layoutContent) {
        throw new Error('Layout não encontrado no Redis. Por favor, atualize o cache ou busque layouts do banco.');
      }
      
      const blob = new Blob([layoutContent], { type: 'application/xml' });
      const layoutFile = new File([blob], `${layoutToUse.name || 'layout'}.xml`, { type: 'application/xml' });

      const request: ParseRequest = {
        layoutFile,
        txtFile,
        layoutName: layoutToUse.name,
      };

      const result = await parseService.parseFiles(request);
      
      // Log detalhado da resposta
      console.log('✅ Parsing concluído:', result);
      console.log('📊 Detalhes da resposta:', {
        success: result.success,
        detectedType: result.detectedType,
        hasLayout: !!result.layout,
        layoutElements: result.layout?.elements?.length || 0,
        layoutElementsRaw: result.layout?.elements,
        layoutFull: result.layout,
        fieldsCount: result.fields?.length || 0,
        fields: result.fields,
        hasText: !!result.text,
        textLength: result.text?.length || 0,
        documentStructure: result.documentStructure,
        summary: result.summary,
        errors: result.errors,
        warnings: result.warnings,
      });
      
      // Atualizar estado
      setParseResult(result);
      if (result.text) {
        setTxtContent(result.text);
      }
      if (result.fields && result.fields.length > 0) {
        console.log('✅ Salvando campos no store:', result.fields.length);
        setFields(result.fields);
      } else {
        console.warn('⚠️ Nenhum campo na resposta ou array vazio');
        setFields([]);
      }
      
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
    </div>
  );
};

export default UploadSection;

