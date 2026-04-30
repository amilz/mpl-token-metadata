/**
 * Test setup utilities for js-kit client
 */

import type { Address } from '@solana/kit';
import {
  createClient,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  airdropFactory,
  lamports,
  type Rpc,
  type RpcSubscriptions,
  type SolanaRpcApi,
  type SolanaRpcSubscriptionsApi,
} from '@solana/kit';
import { solanaLocalRpc } from '@solana/kit-plugin-rpc';
import { airdropSigner, generatedSigner } from '@solana/kit-plugin-signer';
import { systemProgram } from '@solana-program/system';
import { tokenProgram } from '@solana-program/token';
import { mplTokenMetadataProgram } from '../src';

// Re-export transaction utilities
export { sendAndConfirm, sendAndConfirmInstructions } from './_transaction';
// Re-export account fetchers from official package
export { fetchMint, fetchToken } from '@solana-program/token';
// Re-export program addresses and PDAs from hooked folder
export {
  findAssociatedTokenPda,
  SPL_TOKEN_PROGRAM_ADDRESS,
  SPL_TOKEN_2022_PROGRAM_ADDRESS,
  SPL_ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
} from '../src/hooked/pdas';
// Re-export signer generation
export { generateKeyPairSigner as createKeypair } from '@solana/kit';

const LOCAL_VALIDATOR_URL = 'http://127.0.0.1:8899';
const LOCAL_VALIDATOR_WS_URL = 'ws://127.0.0.1:8900';

export function createRpc(): Rpc<SolanaRpcApi> {
  return createSolanaRpc(LOCAL_VALIDATOR_URL);
}

export function createRpcSubscriptions(): RpcSubscriptions<SolanaRpcSubscriptionsApi> {
  return createSolanaRpcSubscriptions(LOCAL_VALIDATOR_WS_URL);
}

export function basisPoints(percent: number): number {
  return Math.round(percent * 100);
}

export async function canRunTests(): Promise<boolean> {
  try {
    const rpc = createRpc();
    await rpc.getVersion().send();
    return true;
  } catch {
    return false;
  }
}

export function getSkipMessage(): string {
  return `
Local Solana validator is not running.

To run these tests:
1. Start the local validator from the repository root:
   pnpm validator

2. Run the tests:
   pnpm test

The validator should be running at ${LOCAL_VALIDATOR_URL}
`.trim();
}

/**
 * Create a localhost client preloaded with the system, token, and mpl-token-metadata
 * program plugins. Generates and funds a fresh payer.
 */
export async function createMplClient() {
  return await createClient()
    .use(generatedSigner())
    .use(solanaLocalRpc())
    .use(airdropSigner(lamports(10_000_000_000n)))
    .use(systemProgram())
    .use(tokenProgram())
    .use(mplTokenMetadataProgram());
}

export async function airdrop(
  rpc: Rpc<SolanaRpcApi>,
  recipient: Address,
  amount: bigint = 10_000_000_000n
): Promise<void> {
  const rpcSubscriptions = createRpcSubscriptions();
  const airdropFn = airdropFactory({ rpc, rpcSubscriptions });

  await airdropFn({
    recipientAddress: recipient,
    lamports: lamports(amount),
    commitment: 'confirmed',
  });
}
