# DeFiBridgePlus

[![CI](https://github.com/centxyz/DeFiBridgePlus/actions/workflows/ci.yml/badge.svg)](https://github.com/centxyz/DeFiBridgePlus/actions/workflows/ci.yml)

DeFiBridgePlus is a cross-chain route inspection and transaction-preparation CLI powered by LI.FI's bridge aggregator API. It discovers supported chains and tokens, requests real bridge quotes, compares route costs and duration, and emits a restricted unsigned transaction request for wallet review.

It deliberately never accepts a private key, signs, approves, or broadcasts transactions.

## Install

```bash
git clone https://github.com/centxyz/DeFiBridgePlus.git
cd DeFiBridgePlus
npm install
```

## Discover and quote

```bash
npm start -- chains
npm start -- tokens --chains 1,137

npm start -- quote \
  --from-chain 1 --to-chain 137 \
  --from-token USDC --to-token USDC \
  --amount 1000000 \
  --from-address 0xYOUR_EVM_ADDRESS \
  --slippage 0.005 --order CHEAPEST \
  --save bridge-quote.json
```

`--amount` uses the token's smallest unit: for a six-decimal token, `1000000` is one token. A saved file is created with mode `0600` and will not overwrite an existing file. Set `LIFI_API_KEY` for registered API limits; public requests may work without it.

## Output and safety

The quote contains input/output amounts, the guaranteed minimum, bridge tool, expected duration, gas and fee estimates, approval target, included steps, and a sanitized unsigned transaction. Quotes expire and market conditions change—request a fresh quote and independently verify every field in a trusted wallet before signing.

## Test

```bash
npm test
```

The client follows LI.FI's documented `GET /v1/quote` contract: [official quote documentation](https://docs.li.fi/li.fi-api/li.fi-api/requesting-a-quote).

## License

MIT © cent

## Current limitations

- Quotes depend on LI.FI availability and can become stale as fees, balances, and routes change.
- The tool prepares unsigned requests but does not approve tokens, sign, broadcast, or guarantee settlement.
- Users must independently verify the destination chain, token addresses, calldata, allowances, and wallet prompts.
