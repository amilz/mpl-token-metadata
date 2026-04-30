/**
 * Plugin tests for the @solana/kit overlay surface
 *
 * Exercises `mplTokenMetadataProgram()` via `createLocalClient`:
 * - generated account fetchers via `client.mplTokenMetadata.accounts.*`
 * - generated PDA helpers via `client.mplTokenMetadata.pdas.*`
 * - hand-written `createNft` / `createAndMint` helpers
 * - hand-written `fetchDigitalAsset*` aggregators
 */

import test from 'ava';
import { TokenStandard } from '../src/generated/types';
import {
  createKeypair,
  createMplClient,
  basisPoints,
  canRunTests,
  getSkipMessage,
  findAssociatedTokenPda,
  airdrop,
} from './_setup';

test('plugin: createNft + fetchMetadata via plugin surface', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint = await createKeypair();

  await client.mplTokenMetadata.instructions
    .createNft({
      mint,
      name: 'Plugin NFT',
      uri: 'https://example.com/plugin.json',
      sellerFeeBasisPoints: basisPoints(5),
      tokenOwner: client.payer.address,
    })
    .sendTransaction();

  const [metadataPda] = await client.mplTokenMetadata.pdas.metadata({
    mint: mint.address,
  });
  const metadata = await client.mplTokenMetadata.accounts.metadata.fetch(metadataPda);
  t.is(metadata.data.mint, mint.address);
  t.is(metadata.data.name, 'Plugin NFT');
  t.is(metadata.data.sellerFeeBasisPoints, 500);
});

test('plugin: createAndMint + fetchDigitalAsset', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint = await createKeypair();

  await client.mplTokenMetadata.instructions
    .createAndMint({
      mint,
      name: 'Plugin Combined',
      uri: 'https://example.com/combined.json',
      sellerFeeBasisPoints: basisPoints(2.5),
      tokenStandard: TokenStandard.NonFungible,
      amount: 1,
      tokenOwner: client.payer.address,
    })
    .sendTransaction();

  const asset = await client.mplTokenMetadata.fetchDigitalAsset(mint.address);
  t.is(asset.address, mint.address);
  t.is(asset.metadata.name, 'Plugin Combined');
  t.truthy(asset.edition);
  t.is(asset.edition?.isOriginal, true);
});

test('plugin: fetchDigitalAssetWithAssociatedToken returns token state', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint = await createKeypair();

  await client.mplTokenMetadata.instructions
    .createNft({
      mint,
      name: 'Owned NFT',
      uri: 'https://example.com/owned.json',
      sellerFeeBasisPoints: basisPoints(0),
      tokenOwner: client.payer.address,
    })
    .sendTransaction();

  const owned = await client.mplTokenMetadata.fetchDigitalAssetWithAssociatedToken(
    mint.address,
    client.payer.address
  );
  t.is(owned.token.mint, mint.address);
  t.is(owned.token.owner, client.payer.address);
  t.is(owned.token.amount, 1n);
});

test('plugin: createProgrammableNft + fetchDigitalAsset', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint = await createKeypair();

  await client.mplTokenMetadata.instructions
    .createProgrammableNft({
      mint,
      name: 'Plugin PNFT',
      uri: 'https://example.com/pnft.json',
      sellerFeeBasisPoints: basisPoints(7.5),
      tokenOwner: client.payer.address,
    })
    .sendTransaction();

  const asset = await client.mplTokenMetadata.fetchDigitalAsset(mint.address);
  t.is(asset.address, mint.address);
  t.is(asset.metadata.name, 'Plugin PNFT');
  if (asset.metadata.tokenStandard.__option === 'Some') {
    t.is(asset.metadata.tokenStandard.value, TokenStandard.ProgrammableNonFungible);
  }
  t.truthy(asset.edition);
  t.is(asset.edition?.isOriginal, true);
});

test('plugin: fetchDigitalAssetByMetadata returns asset by metadata pda', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint = await createKeypair();

  await client.mplTokenMetadata.instructions
    .createNft({
      mint,
      name: 'By Metadata',
      uri: 'https://example.com/by-metadata.json',
      sellerFeeBasisPoints: basisPoints(1),
      tokenOwner: client.payer.address,
    })
    .sendTransaction();

  const [metadataPda] = await client.mplTokenMetadata.pdas.metadata({
    mint: mint.address,
  });
  const asset = await client.mplTokenMetadata.fetchDigitalAssetByMetadata(metadataPda);
  t.is(asset.address, mint.address);
  t.is(asset.metadata.name, 'By Metadata');
});

test('plugin: fetchAllDigitalAsset batches multiple mints', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint1 = await createKeypair();
  const mint2 = await createKeypair();

  for (const [index, mint] of [mint1, mint2].entries()) {
    await client.mplTokenMetadata.instructions
      .createNft({
        mint,
        name: `Batch NFT ${index + 1}`,
        uri: `https://example.com/batch${index + 1}.json`,
        sellerFeeBasisPoints: basisPoints(1),
        tokenOwner: client.payer.address,
      })
      .sendTransaction();
  }

  const assets = await client.mplTokenMetadata.fetchAllDigitalAsset([mint1.address, mint2.address]);
  t.is(assets.length, 2);
  t.is(assets[0].metadata.name, 'Batch NFT 1');
  t.is(assets[1].metadata.name, 'Batch NFT 2');
});

test('plugin: fetchDigitalAssetWithToken returns explicit token state', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint = await createKeypair();

  await client.mplTokenMetadata.instructions
    .createNft({
      mint,
      name: 'Explicit Token NFT',
      uri: 'https://example.com/explicit.json',
      sellerFeeBasisPoints: basisPoints(0),
      tokenOwner: client.payer.address,
    })
    .sendTransaction();

  const [tokenAddress] = await findAssociatedTokenPda({
    mint: mint.address,
    owner: client.payer.address,
  });
  const owned = await client.mplTokenMetadata.fetchDigitalAssetWithToken(
    mint.address,
    tokenAddress
  );
  t.is(owned.address, mint.address);
  t.is(owned.token.mint, mint.address);
  t.is(owned.token.owner, client.payer.address);
  t.is(owned.token.amount, 1n);
});

test('plugin: explicit payer overrides client.payer fallback', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint = await createKeypair();
  const altPayer = await createKeypair();
  await airdrop(client.rpc, altPayer.address);

  await client.mplTokenMetadata.instructions
    .createNft({
      mint,
      payer: altPayer,
      authority: altPayer,
      name: 'Alt Payer NFT',
      uri: 'https://example.com/alt-payer.json',
      sellerFeeBasisPoints: basisPoints(1),
      tokenOwner: altPayer.address,
    })
    .sendTransaction();

  const [metadataPda] = await client.mplTokenMetadata.pdas.metadata({
    mint: mint.address,
  });
  const metadata = await client.mplTokenMetadata.accounts.metadata.fetch(metadataPda);
  t.is(metadata.data.updateAuthority, altPayer.address);
  t.not(metadata.data.updateAuthority, client.payer.address);
});

test('plugin: raw generated instruction (signMetadata) is wired through overlay', async (t) => {
  if (!(await canRunTests())) {
    t.log(getSkipMessage());
    t.pass('Skipped - validator not running');
    return;
  }

  const client = await createMplClient();
  const mint = await createKeypair();

  await client.mplTokenMetadata.instructions
    .createNft({
      mint,
      name: 'Sign Me',
      uri: 'https://example.com/sign-me.json',
      sellerFeeBasisPoints: basisPoints(0),
      tokenOwner: client.payer.address,
    })
    .sendTransaction();

  const [metadataPda] = await client.mplTokenMetadata.pdas.metadata({
    mint: mint.address,
  });

  await client.mplTokenMetadata.instructions
    .signMetadata({
      metadata: metadataPda,
      creator: client.payer,
    })
    .sendTransaction();

  const metadata = await client.mplTokenMetadata.accounts.metadata.fetch(metadataPda);
  t.is(metadata.data.creators.__option, 'Some');
  if (metadata.data.creators.__option === 'Some') {
    const signer = metadata.data.creators.value.find((c) => c.address === client.payer.address);
    t.truthy(signer);
    t.is(signer?.verified, true);
  }
});
