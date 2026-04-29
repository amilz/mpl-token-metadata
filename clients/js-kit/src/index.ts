/**
 * Metaplex Token Metadata - Codama Client
 *
 * @solana/kit (web3.js 2.0) client for mpl-token-metadata, generated using Codama.
 */

export * from './generated';

// Plugin overlay (must be re-exported explicitly so it shadows the generated names).
export {
  mplTokenMetadataProgram,
  type MplTokenMetadataPlugin,
  type MplTokenMetadataPluginInstructions,
  type MplTokenMetadataPluginRequirements,
} from './plugin';

export * from './hooked';
