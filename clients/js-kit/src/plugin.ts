import {
  pipe,
  sequentialInstructionPlan,
  type Address,
  type ClientWithPayer,
  type FetchAccountConfig,
  type FetchAccountsConfig,
  type InstructionPlan,
} from '@solana/kit';
import {
  addSelfPlanAndSendFunctions,
  type SelfPlanAndSendFunctions,
} from '@solana/program-client-core';

import {
  mplTokenMetadataProgram as generatedMplTokenMetadataProgram,
  type MplTokenMetadataPlugin as GeneratedMplTokenMetadataPlugin,
  type MplTokenMetadataPluginInstructions as GeneratedMplTokenMetadataPluginInstructions,
  type MplTokenMetadataPluginRequirements as GeneratedMplTokenMetadataPluginRequirements,
} from './generated';
import {
  createAndMint,
  createNft,
  createProgrammableNft,
  type CreateAndMintInput,
} from './hooked/createHelpers';
import {
  fetchAllDigitalAsset,
  fetchDigitalAsset,
  fetchDigitalAssetByMetadata,
  type DigitalAsset,
} from './hooked/digitalAsset';
import {
  fetchDigitalAssetWithToken,
  fetchDigitalAssetWithAssociatedToken,
  type DigitalAssetWithToken,
} from './hooked/digitalAssetWithToken';

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type CreateNftInput = Parameters<typeof createNft>[0];
type CreateProgrammableNftInput = Parameters<typeof createProgrammableNft>[0];
type PlanResult = Promise<InstructionPlan> & SelfPlanAndSendFunctions;

export type MplTokenMetadataPluginRequirements = GeneratedMplTokenMetadataPluginRequirements &
  ClientWithPayer;

export type MplTokenMetadataPluginInstructions = GeneratedMplTokenMetadataPluginInstructions & {
  /** Create a new asset and mint it in one sequential plan. */
  createAndMint: (input: MakeOptional<CreateAndMintInput, 'payer'>) => PlanResult;
  /** Create and mint a NonFungible NFT (amount=1). */
  createNft: (input: MakeOptional<CreateNftInput, 'payer'>) => PlanResult;
  /** Create and mint a ProgrammableNonFungible NFT (amount=1). */
  createProgrammableNft: (input: MakeOptional<CreateProgrammableNftInput, 'payer'>) => PlanResult;
};

export type MplTokenMetadataPlugin = Omit<GeneratedMplTokenMetadataPlugin, 'instructions'> & {
  instructions: MplTokenMetadataPluginInstructions;
  /** Fetch a digital asset (mint + metadata + edition) by mint address. */
  fetchDigitalAsset: <TMint extends string = string>(
    mint: Address<TMint>,
    config?: FetchAccountConfig
  ) => Promise<DigitalAsset<TMint>>;
  /** Fetch a digital asset by metadata address. */
  fetchDigitalAssetByMetadata: (
    metadataAddress: Address,
    config?: FetchAccountConfig
  ) => Promise<DigitalAsset>;
  /** Fetch multiple digital assets by mint addresses. */
  fetchAllDigitalAsset: (mints: Address[], config?: FetchAccountsConfig) => Promise<DigitalAsset[]>;
  /** Fetch a digital asset together with a specific token account. */
  fetchDigitalAssetWithToken: (
    mint: Address,
    token: Address,
    config?: FetchAccountConfig
  ) => Promise<DigitalAssetWithToken>;
  /** Fetch a digital asset together with the owner's ATA. */
  fetchDigitalAssetWithAssociatedToken: (
    mint: Address,
    owner: Address,
    config?: FetchAccountConfig
  ) => Promise<DigitalAssetWithToken>;
};

export function mplTokenMetadataProgram() {
  return <T extends MplTokenMetadataPluginRequirements>(client: T) => {
    return pipe(client, generatedMplTokenMetadataProgram(), (c) => ({
      ...c,
      mplTokenMetadata: {
        ...c.mplTokenMetadata,
        instructions: {
          ...c.mplTokenMetadata.instructions,
          createAndMint: (input) =>
            addSelfPlanAndSendFunctions(
              client,
              createAndMint({ payer: client.payer, ...input }).then((ixs) =>
                sequentialInstructionPlan(ixs)
              )
            ),
          createNft: (input) =>
            addSelfPlanAndSendFunctions(
              client,
              createNft({ payer: client.payer, ...input }).then((ixs) =>
                sequentialInstructionPlan(ixs)
              )
            ),
          createProgrammableNft: (input) =>
            addSelfPlanAndSendFunctions(
              client,
              createProgrammableNft({ payer: client.payer, ...input }).then((ixs) =>
                sequentialInstructionPlan(ixs)
              )
            ),
        },
        fetchDigitalAsset: (mint, config?) => fetchDigitalAsset(client.rpc, mint, config),
        fetchDigitalAssetByMetadata: (metadataAddress, config?) =>
          fetchDigitalAssetByMetadata(client.rpc, metadataAddress, config),
        fetchAllDigitalAsset: (mints, config?) => fetchAllDigitalAsset(client.rpc, mints, config),
        fetchDigitalAssetWithToken: (mint, token, config?) =>
          fetchDigitalAssetWithToken(client.rpc, mint, token, config),
        fetchDigitalAssetWithAssociatedToken: (mint, owner, config?) =>
          fetchDigitalAssetWithAssociatedToken(client.rpc, mint, owner, config),
      } satisfies MplTokenMetadataPlugin,
    }));
  };
}
