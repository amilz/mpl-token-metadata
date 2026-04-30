/**
 * Metaplex Token Metadata - Codama Client
 *
 * @solana/kit (web3.js 2.0) client for mpl-token-metadata, generated using Codama.
 */

export * from './generated';

// Plugin overlay — explicit named re-exports shadow the generated names.
export {
  mplTokenMetadataProgram,
  type MplTokenMetadataPlugin,
  type MplTokenMetadataPluginInstructions,
} from './plugin';

export * from './hooked';
