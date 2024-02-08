import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import { networks } from './constants/networks.js'
import { publicKey, keypairIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { generateSigner, some, none, percentAmount } from '@metaplex-foundation/umi'
import {
    createNft, printSupply,
    printV1,
    fetchMasterEditionFromSeeds,
    TokenStandard
} from '@metaplex-foundation/mpl-token-metadata'
import { create } from '@metaplex-foundation/mpl-candy-machine'
import fs from 'fs'
import bs58 from 'bs58'
import { Connection, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";

// Connects to umi
const network = networks.devnet.url
const umi = createUmi(network).use(mplCandyMachine())

// Create new keypair if needed
if (!fs.existsSync('./configs/keypair.json')) {
    const newRandomKeyPair = umi.eddsa.generateKeypair();
    fs.writeFileSync('./configs/keypair.json', JSON.stringify({
        publicKey: newRandomKeyPair.publicKey.toString(),
        secretKey: bs58.encode(newRandomKeyPair.secretKey)
    }))
}

// Restore wallet
const keypair = JSON.parse(fs.readFileSync('./configs/keypair.json', 'utf-8'))
let privateKey = new Uint8Array(bs58.decode(keypair.secretKey))
const wallet = umi.eddsa.createKeypairFromSecretKey(privateKey);
const signer = createSignerFromKeypair(umi, wallet);
console.log("Using:", wallet.publicKey.toString())
umi.use(keypairIdentity(signer))

// Create the Collection NFT.
console.log("Generating NFT...")

const collectionMint = JSON.parse(fs.readFileSync('./configs/collectionMint.json', 'utf-8'))
const masterEdition = await fetchMasterEditionFromSeeds(umi, {
    mint: collectionMint.publicKey,
})
console.log("Master Edition:", masterEdition)
const editionMint = generateSigner(umi)
const receiver = "548qGg85DJGogVkiw7DuSDPnuBHG8EvoMwt7gU2tz1Vn"
console.log("Sending to:", receiver)

const printed = await printV1(umi, {
    masterTokenAccountOwner: wallet.publicKey,
    masterEditionMint: collectionMint.publicKey,
    editionMint,
    editionTokenAccountOwner: receiver,
    editionNumber: masterEdition.supply + 1n,
    tokenStandard: TokenStandard.NonFungible,
}).sendAndConfirm(umi)
console.log("Printed NFT:", printed)
console.log(bs58.encode(printed.signature))