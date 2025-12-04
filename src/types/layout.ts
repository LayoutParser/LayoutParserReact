// Tipos para Layouts

export interface Layout {
  layoutGuid: string;
  name: string;
  description?: string;
  decryptedContent?: string; // Conteúdo descriptografado (se estiver no Redis)
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

