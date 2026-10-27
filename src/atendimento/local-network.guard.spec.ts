import { isLocalNetworkAddress } from './local-network.guard';

describe('isLocalNetworkAddress', () => {
  it.each([
    '127.0.0.1',
    '::1',
    '::ffff:192.168.1.24',
    '10.20.30.40',
    '172.20.0.10',
    'fd12:3456::1',
    'fe80::1',
  ])('allows local address %s', (address) => {
    expect(isLocalNetworkAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '172.32.0.1', '192.167.0.1', '2001:4860:4860::8888'])(
    'rejects public address %s',
    (address) => {
      expect(isLocalNetworkAddress(address)).toBe(false);
    },
  );
});
