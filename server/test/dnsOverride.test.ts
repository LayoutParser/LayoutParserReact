import { beforeEach, describe, expect, it, vi } from 'vitest';

const setGlobalDispatcher = vi.fn();
const AgentMock = vi.fn(function AgentMock(this: unknown, options: unknown) {
  return { options };
});

vi.mock('undici', () => ({
  Agent: AgentMock,
  setGlobalDispatcher: (...args: unknown[]) => setGlobalDispatcher(...args),
}));

const setServers = vi.fn();
const resolve4 = vi.fn();
const resolve6 = vi.fn();

vi.mock('node:dns', () => ({
  default: {
    Resolver: vi.fn(function ResolverMock(this: {
      setServers: typeof setServers;
      resolve4: typeof resolve4;
      resolve6: typeof resolve6;
    }) {
      this.setServers = setServers;
      this.resolve4 = resolve4;
      this.resolve6 = resolve6;
    }),
  },
}));

const { applyDnsOverride } = await import('../src/dnsOverride.js');

// Extrai a função `lookup` passada ao Agent do undici na última chamada.
function getRegisteredLookup(): (
  hostname: string,
  options: { all?: boolean; family?: 4 | 6 },
  callback: (...args: unknown[]) => void
) => void {
  const lastCall = AgentMock.mock.calls.at(-1) as [{ connect: { lookup: unknown } }] | undefined;
  if (!lastCall) {
    throw new Error('Agent não foi chamado.');
  }
  return lastCall[0].connect.lookup as ReturnType<typeof getRegisteredLookup>;
}

describe('applyDnsOverride', () => {
  beforeEach(() => {
    setGlobalDispatcher.mockReset();
    AgentMock.mockClear();
    setServers.mockReset();
    resolve4.mockReset();
    resolve6.mockReset();
  });

  it('não aplica nada quando a lista de servidores está vazia', () => {
    const result = applyDnsOverride([]);

    expect(result).toEqual({ applied: false, servers: [] });
    expect(setGlobalDispatcher).not.toHaveBeenCalled();
    expect(AgentMock).not.toHaveBeenCalled();
  });

  it('aplica o dispatcher global quando servidores são informados', () => {
    const servers = ['10.0.0.1', '10.0.0.2'];
    const result = applyDnsOverride(servers);

    expect(result).toEqual({ applied: true, servers });
    expect(setServers).toHaveBeenCalledWith(servers);
    expect(setGlobalDispatcher).toHaveBeenCalledTimes(1);
    expect(AgentMock).toHaveBeenCalledTimes(1);
  });

  it('resolve via IPv4 (family padrão) e retorna o primeiro endereço', () => {
    applyDnsOverride(['10.0.0.1']);
    const lookup = getRegisteredLookup();

    resolve4.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(null, ['1.2.3.4', '1.2.3.5']);
    });

    const callback = vi.fn();
    lookup('example.com', {}, callback);

    expect(resolve4).toHaveBeenCalledWith('example.com', expect.any(Function));
    expect(callback).toHaveBeenCalledWith(null, '1.2.3.4', 4);
  });

  it('retorna todos os endereços quando options.all é true', () => {
    applyDnsOverride(['10.0.0.1']);
    const lookup = getRegisteredLookup();

    resolve4.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(null, ['1.2.3.4', '1.2.3.5']);
    });

    const callback = vi.fn();
    lookup('example.com', { all: true }, callback);

    expect(callback).toHaveBeenCalledWith(null, [
      { address: '1.2.3.4', family: 4 },
      { address: '1.2.3.5', family: 4 },
    ]);
  });

  it('cai para IPv6 quando não há registro A', () => {
    applyDnsOverride(['10.0.0.1']);
    const lookup = getRegisteredLookup();

    resolve4.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(null, []);
    });
    resolve6.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(null, ['::1']);
    });

    const callback = vi.fn();
    lookup('example.com', {}, callback);

    expect(resolve6).toHaveBeenCalledWith('example.com', expect.any(Function));
    expect(callback).toHaveBeenCalledWith(null, '::1', 6);
  });

  it('propaga erro quando não há registro A nem AAAA', () => {
    applyDnsOverride(['10.0.0.1']);
    const lookup = getRegisteredLookup();

    const error4 = new Error('sem A');
    resolve4.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(error4);
    });
    resolve6.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(null, []);
    });

    const callback = vi.fn();
    lookup('example.com', {}, callback);

    expect(callback).toHaveBeenCalledWith(error4, '');
  });

  it('propaga erro do AAAA quando não há erro de A mas o fallback também falha', () => {
    applyDnsOverride(['10.0.0.1']);
    const lookup = getRegisteredLookup();

    resolve4.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(null, []);
    });
    const error6 = new Error('sem AAAA');
    resolve6.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(error6);
    });

    const callback = vi.fn();
    lookup('example.com', {}, callback);

    expect(callback).toHaveBeenCalledWith(error6, '');
  });

  it('resolve diretamente via IPv6 quando family é 6', () => {
    applyDnsOverride(['10.0.0.1']);
    const lookup = getRegisteredLookup();

    resolve6.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(null, ['::2']);
    });

    const callback = vi.fn();
    lookup('example.com', { family: 6 }, callback);

    expect(resolve6).toHaveBeenCalledWith('example.com', expect.any(Function));
    expect(resolve4).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null, '::2', 6);
  });

  it('propaga erro quando family é 6 e não há registro AAAA', () => {
    applyDnsOverride(['10.0.0.1']);
    const lookup = getRegisteredLookup();

    const error6 = new Error('sem AAAA');
    resolve6.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(error6);
    });

    const callback = vi.fn();
    lookup('example.com', { family: 6 }, callback);

    expect(callback).toHaveBeenCalledWith(error6, '');
  });

  it('retorna todos os endereços IPv6 quando family é 6 e options.all é true', () => {
    applyDnsOverride(['10.0.0.1']);
    const lookup = getRegisteredLookup();

    resolve6.mockImplementation((_hostname: string, callback: (...args: unknown[]) => void) => {
      callback(null, ['::2', '::3']);
    });

    const callback = vi.fn();
    lookup('example.com', { family: 6, all: true }, callback);

    expect(callback).toHaveBeenCalledWith(null, [
      { address: '::2', family: 6 },
      { address: '::3', family: 6 },
    ]);
  });
});
