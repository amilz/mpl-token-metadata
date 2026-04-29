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
import { createKeypair, createMplClient, basisPoints, canRunTests, getSkipMessage } from './_setup';

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
