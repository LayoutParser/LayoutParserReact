// Tipos para Layouts

export interface Layout {
  layoutGuid: string;
  name: string;
  description?: string;
  decryptedContent?: string; // Conteúdo descriptografado (se estiver no Redis)
  // Nome alternativo que a API usa para o mesmo conteúdo em algumas respostas do catálogo.
  // O consumo real (LayoutParserPage) sempre tenta `decryptedContent` primeiro e cai aqui.
  valueContent?: string;
  version?: string;
  layoutType?: string;
}

export interface LayoutSearchResponse {
  success: boolean;
  layouts?: Layout[];
  totalFound?: number;
  message?: string;
}

export interface SelectedLayout {
  layout: Layout;
  index: number;
}
