const API_BASE = 'https://li.quest/v1';

class BridgeError extends Error { constructor(message, code = 'BRIDGE_ERROR', details) { super(message); this.name = 'BridgeError'; this.code = code; this.details = details; } }
const isAddress = value => /^0x[a-fA-F0-9]{40}$/.test(value || '');

class DeFiBridgePlus {
  constructor({ fetchImpl = globalThis.fetch, apiKey, timeout = 15000 } = {}) {
    if (typeof fetchImpl !== 'function') throw new BridgeError('A fetch implementation is required', 'CONFIG');
    this.fetch = fetchImpl; this.apiKey = apiKey; this.timeout = timeout;
  }

  async chains() { const data = await this.request('/chains'); return data.chains || []; }
  async tokens(chains) {
    const suffix = chains?.length ? `?chains=${encodeURIComponent(chains.join(','))}` : '';
    const data = await this.request(`/tokens${suffix}`); return data.tokens || {};
  }

  async quote(input) {
    const params = validateQuote(input);
    const query = new URLSearchParams({
      fromChain: String(params.fromChain), toChain: String(params.toChain), fromToken: params.fromToken, toToken: params.toToken,
      fromAmount: params.fromAmount, fromAddress: params.fromAddress, toAddress: params.toAddress || params.fromAddress,
      slippage: String(params.slippage ?? 0.005), order: params.order || 'FASTEST', integrator: 'defibridgeplus'
    });
    const step = await this.request(`/quote?${query}`);
    return summarizeQuote(step);
  }

  async request(path) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await this.fetch(`${API_BASE}${path}`, { headers: { accept: 'application/json', ...(this.apiKey ? { 'x-lifi-api-key': this.apiKey } : {}) }, signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new BridgeError(payload.message || `Bridge API returned HTTP ${response.status}`, payload.code || 'API', payload);
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new BridgeError(`Bridge API timed out after ${this.timeout}ms`, 'TIMEOUT');
      throw error;
    } finally { clearTimeout(timer); }
  }
}

function validateQuote(input = {}) {
  if (!input.fromChain || !input.toChain || !input.fromToken || !input.toToken || !input.fromAmount) throw new BridgeError('fromChain, toChain, fromToken, toToken, and fromAmount are required', 'INPUT');
  if (!/^\d+$/.test(String(input.fromAmount)) || BigInt(input.fromAmount) <= 0n) throw new BridgeError('fromAmount must be a positive base-unit integer', 'INPUT');
  if (!isAddress(input.fromAddress) || (input.toAddress && !isAddress(input.toAddress))) throw new BridgeError('Wallet addresses must be 20-byte EVM addresses', 'INPUT');
  const slippage = input.slippage == null ? 0.005 : Number(input.slippage);
  if (!Number.isFinite(slippage) || slippage < 0 || slippage > 1) throw new BridgeError('Slippage must be between 0 and 1', 'INPUT');
  const order = input.order || 'FASTEST';
  if (!['FASTEST', 'CHEAPEST'].includes(order)) throw new BridgeError('Order must be FASTEST or CHEAPEST', 'INPUT');
  return { ...input, slippage, order };
}

function summarizeQuote(step) {
  if (!step?.estimate || !step?.action || !step?.transactionRequest) throw new BridgeError('Bridge API returned an incomplete quote', 'INVALID_RESPONSE');
  const gasUSD = (step.estimate.gasCosts || []).reduce((sum, cost) => sum + (Number(cost.amountUSD) || 0), 0);
  const feesUSD = (step.estimate.feeCosts || []).reduce((sum, cost) => sum + (Number(cost.amountUSD) || 0), 0);
  return {
    id: step.id, tool: step.tool, fromChainId: step.action.fromChainId, toChainId: step.action.toChainId,
    fromToken: step.action.fromToken, toToken: step.action.toToken, fromAmount: step.estimate.fromAmount,
    toAmount: step.estimate.toAmount, toAmountMin: step.estimate.toAmountMin, executionDuration: step.estimate.executionDuration,
    gasUSD, feesUSD, approvalAddress: step.estimate.approvalAddress || null,
    transaction: sanitizeTransaction(step.transactionRequest), includedSteps: step.includedSteps || []
  };
}

function sanitizeTransaction(tx) {
  const allowed = ['from', 'to', 'data', 'value', 'gasLimit', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'chainId'];
  return Object.fromEntries(allowed.filter(key => tx[key] != null).map(key => [key, tx[key]]));
}
module.exports = { DeFiBridgePlus, BridgeError, validateQuote, summarizeQuote, sanitizeTransaction };
