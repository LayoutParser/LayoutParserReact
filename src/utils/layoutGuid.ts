/**
 * Utilitários para o identificador de layout (`layoutGuid`).
 *
 * Existe porque há DUAS fontes concorrentes para esse identificador e elas discordam:
 * o catálogo (`selectedLayout.layoutGuid`) pode devolver o layout com GUID ZERADO
 * (`00000000-0000-0000-0000-000000000000`), enquanto o parse do arquivo devolve o GUID
 * correto (ex.: `LAY_aa423936-33b2-4aaf-b7d7-3868be141107`). Observado em log de execução
 * real. Quem consulta o mapper com o GUID zerado nunca acha mapper.
 */

/**
 * Um `layoutGuid` só é utilizável se existir e não for o GUID "zerado".
 *
 * Tolerante às variações de formatação vistas nos dados reais: prefixo `LAY_`, chaves e
 * hifens são ignorados na checagem — o que importa é sobrar algum dígito diferente de zero.
 */
export const isUsableLayoutGuid = (guid?: string | null): boolean => {
  if (!guid) {
    return false;
  }

  const normalized = guid
    .trim()
    .replace(/^LAY_/i, '')
    .replace(/[-{}\s]/g, '');

  if (!normalized) {
    return false;
  }

  return !/^0+$/.test(normalized);
};

/**
 * Escolhe o `layoutGuid` que deve alimentar consultas à API.
 *
 * PRIORIDADE: o GUID vindo do PARSE, com o do catálogo apenas como fallback.
 *
 * NÃO inverta esta ordem "para simplificar": com o GUID zerado do catálogo, a consulta de
 * mapper não encontra nada, a aba de XML Transformação Final nunca aparece — e continuaria
 * sem aparecer mesmo depois de o back-end corrigir o catálogo, porque o front seguiria
 * perguntando com o identificador errado.
 */
export const resolveLayoutGuid = (
  parsedLayoutGuid?: string | null,
  catalogLayoutGuid?: string | null
): string | undefined => {
  if (isUsableLayoutGuid(parsedLayoutGuid)) {
    return parsedLayoutGuid as string;
  }

  if (isUsableLayoutGuid(catalogLayoutGuid)) {
    return catalogLayoutGuid as string;
  }

  return undefined;
};
