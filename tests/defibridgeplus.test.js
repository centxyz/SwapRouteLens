const test = require('node:test'); const assert = require('node:assert/strict');
const { DeFiBridgePlus, validateQuote, summarizeQuote, sanitizeTransaction } = require('../src/defibridgeplus');
const address = '0x000000000000000000000000000000000000dead';
const quote = { id: 'route-1', tool: 'relay', action: { fromChainId: 1, toChainId: 137, fromToken: { symbol: 'USDC' }, toToken: { symbol: 'USDC' } }, estimate: { fromAmount: '1000000', toAmount: '995000', toAmountMin: '990000', executionDuration: 60, approvalAddress: address, gasCosts: [{ amountUSD: '1.25' }], feeCosts: [{ amountUSD: '0.50' }] }, transactionRequest: { from: address, to: address, data: '0x1234', value: '0x0', nonce: 12 }, includedSteps: [] };
test('validates quote input and base units', () => {
  assert.equal(validateQuote({ fromChain: 1, toChain: 137, fromToken: 'USDC', toToken: 'USDC', fromAmount: '1000000', fromAddress: address }).slippage, .005);
  assert.throws(() => validateQuote({ fromChain: 1, toChain: 2, fromToken: 'A', toToken: 'B', fromAmount: '1.5', fromAddress: address }), /base-unit/);
  assert.throws(() => validateQuote({ fromChain: 1, toChain: 2, fromToken: 'A', toToken: 'B', fromAmount: '1', fromAddress: 'bad' }), /addresses/);
});
test('summarizes routes and strips unsupported transaction fields', () => {
  const result = summarizeQuote(quote); assert.equal(result.gasUSD, 1.25); assert.equal(result.feesUSD, .5); assert.equal(result.transaction.nonce, undefined); assert.equal(result.transaction.data, '0x1234');
  assert.deepEqual(sanitizeTransaction({ to: address, data: '0x', secret: 'no' }), { to: address, data: '0x' });
});
test('calls the LI.FI quote endpoint with safe parameters', async () => {
  let url; const bridge = new DeFiBridgePlus({ fetchImpl: async input => { url = input; return { ok: true, json: async () => quote }; } });
  const result = await bridge.quote({ fromChain: 1, toChain: 137, fromToken: 'USDC', toToken: 'USDC', fromAmount: '1000000', fromAddress: address, order: 'CHEAPEST' });
  assert.equal(result.tool, 'relay'); assert.match(url, /fromChain=1/); assert.match(url, /order=CHEAPEST/); assert.match(url, /integrator=defibridgeplus/);
});
test('loads supported chains and returns structured API errors', async () => {
  const bridge = new DeFiBridgePlus({ fetchImpl: async () => ({ ok: true, json: async () => ({ chains: [{ id: 1 }] }) }) }); assert.deepEqual(await bridge.chains(), [{ id: 1 }]);
  const failing = new DeFiBridgePlus({ fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({ message: 'invalid route', code: 1001 }) }) });
  await assert.rejects(failing.chains(), error => error.message === 'invalid route' && error.code === 1001);
});
