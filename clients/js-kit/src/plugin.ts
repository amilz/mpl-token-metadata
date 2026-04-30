import {
  pipe,
  sequentialInstructionPlan,
  type Address,
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
  type MplTokenMetadataPluginRequirements,
} from './generated';
import {
  createAndMint,
  createNft,
  createProgrammableNft,
  type CreateAndMintInput,
  type CreateNftInput,
  type CreateProgrammableNftInput,
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
type PlanResult = PromiseLike<InstructionPlan> & SelfPlanAndSendFunctions;

export type MplTokenMetadataPluginInstructions = GeneratedMplTokenMetadataPluginInstructions & {
  createAndMint: (input: MakeOptional<CreateAndMintInput, 'payer'>) => PlanResult;
  createNft: (input: MakeOptional<CreateNftInput, 'payer'>) => PlanResult;
  createProgrammableNft: (input: MakeOptional<CreateProgrammableNftInput, 'payer'>) => PlanResult;
};

export type MplTokenMetadataPlugin = Omit<GeneratedMplTokenMetadataPlugin, 'instructions'> & {
  instructions: MplTokenMetadataPluginInstructions;
  fetchDigitalAsset: <TMint extends string = string>(
    mint: Address<TMint>,
    config?: FetchAccountConfig
  ) => Promise<DigitalAsset<TMint>>;
  fetchDigitalAssetByMetadata: (
    metadataAddress: Address,
    config?: FetchAccountConfig
  ) => Promise<DigitalAsset>;
  fetchAllDigitalAsset: (mints: Address[], config?: FetchAccountsConfig) => Promise<DigitalAsset[]>;
  fetchDigitalAssetWithToken: (
    mint: Address,
    token: Address,
    config?: FetchAccountConfig
  ) => Promise<DigitalAssetWithToken>;
  /** Fetches a digital asset together with the owner's associated token account. */
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
              createAndMint({ ...input, payer: input.payer ?? client.payer }).then((ixs) =>
                sequentialInstructionPlan(ixs)
              )
            ),
          createNft: (input) =>
            addSelfPlanAndSendFunctions(
              client,
              createNft({ ...input, payer: input.payer ?? client.payer }).then((ixs) =>
                sequentialInstructionPlan(ixs)
              )
            ),
          createProgrammableNft: (input) =>
            addSelfPlanAndSendFunctions(
              client,
              createProgrammableNft({ ...input, payer: input.payer ?? client.payer }).then((ixs) =>
                sequentialInstructionPlan(ixs)
              )
            ),
        },
        // `config?` is load-bearing: `satisfies` does not widen the inferred literal.
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
