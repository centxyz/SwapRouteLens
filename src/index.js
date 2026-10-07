#!/usr/bin/env node
const minimist = require('minimist'); const { writeFile } = require('node:fs/promises'); const { DeFiBridgePlus } = require('./defibridgeplus');
const help = `DeFiBridgePlus — cross-chain quote and transaction-preparation CLI

Usage:
  defibridgeplus chains
  defibridgeplus tokens [--chains 1,137]
  defibridgeplus quote --from-chain ID --to-chain ID --from-token TOKEN --to-token TOKEN \\
    --amount BASE_UNITS --from-address 0x... [--to-address 0x...] [--slippage 0.005] \\
    [--order FASTEST|CHEAPEST] [--save transaction.json]

Set LIFI_API_KEY for higher API limits. Quote never signs or broadcasts a transaction.`;
async function main() {
  const args = minimist(process.argv.slice(2), { string: ['from-chain','to-chain','from-token','to-token','amount','from-address','to-address','order','save','chains'], boolean: ['help'], alias: { h: 'help' } });
  if (args.help || !args._[0]) { console.log(help); return; }
  const bridge = new DeFiBridgePlus({ apiKey: process.env.LIFI_API_KEY }); const command = String(args._[0]); let result;
  if (command === 'chains') result = await bridge.chains();
  else if (command === 'tokens') result = await bridge.tokens(args.chains ? args.chains.split(',') : undefined);
  else if (command === 'quote') result = await bridge.quote({ fromChain: args['from-chain'], toChain: args['to-chain'], fromToken: args['from-token'], toToken: args['to-token'], fromAmount: args.amount, fromAddress: args['from-address'], toAddress: args['to-address'], slippage: args.slippage, order: args.order });
  else throw new Error(`Unknown command: ${command}`);
  if (args.save) { await writeFile(args.save, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 }); console.error(`Saved quote to ${args.save}`); }
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(error => { console.error(JSON.stringify({ error: error.message, code: error.code || 'INTERNAL', details: error.details })); process.exitCode = 1; });
module.exports = { main };
