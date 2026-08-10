/// <reference types="vite/client" />

/**
 * Tipagem das variáveis de ambiente do Vite.
 *
 * Sem este arquivo, `import.meta.env` não tinha tipo e o código recorria a
 * `(import.meta as any).env` em 4 pontos (services/api.ts, logService.ts e
 * monitoringService.ts) — 4 dos warnings de `no-explicit-any` do lint vinham daqui.
 *
 * `vite/client` já declara BASE_URL/MODE/DEV/PROD/SSR; a interface abaixo faz merge
 * com aquela declaração para acrescentar as vars próprias do projeto (ver `.env.example`).
 */
interface ImportMetaEnv {
  /** URL base da API .NET (LayoutParserApi). Definida em `.env.development`/`.env.production`. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
