// Mensagens amigáveis para os códigos de erro `authError` devolvidos pelo BFF após uma
// tentativa de login OIDC (Microsoft/Google) mal-sucedida. Extraído para módulo próprio
// (em vez de viver em AuthenticationGate.tsx) para não quebrar o Fast Refresh do componente
// e para ser reutilizável pela home pública (HomePage), que mostra o mesmo tipo de alerta.
//
// O BFF registra as mesmas rotas de callback (`registerProviderRoutes` em `server/src/oidc.ts`)
// para os provedores Entra e Google e devolve o mesmo `authError` genérico nos dois casos, sem
// indicar qual provedor falhou — por isso as mensagens abaixo não podem citar "Microsoft" nem
// "Google" especificamente (já aconteceu de "login_failed" citar só Microsoft e aparecer para
// quem tentou entrar com Google).
export const authenticationMessages: Record<string, string> = {
  access_denied: 'A entrada foi cancelada. Você pode tentar novamente quando estiver pronto.',
  invalid_callback:
    'A resposta de autenticação expirou ou não pôde ser validada. Inicie uma nova entrada.',
  login_failed: 'Não foi possível concluir a entrada. Tente novamente.',
  temporarily_unavailable:
    'O serviço de autenticação está temporariamente indisponível. Tente novamente em instantes.',
};
