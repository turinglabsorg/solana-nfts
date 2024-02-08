import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import { networks } from './constants/networks.js'
import { publicKey, keypairIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { generateSigner, some, none, percentAmount } from '@metaplex-foundation/umi'
import { createNft, TokenStandard, printSupply } from '@metaplex-foundation/mpl-token-metadata'
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

// Get an airdrop
// try {
//     console.log("Requesting airdrop...")
//     const connection = new Connection(network);
//     let tw = Keypair.fromSecretKey(privateKey)
//     console.log('Requesting airdrop for:', tw.publicKey.toString())
//     let airdropSignature = await connection.requestAirdrop(
//         tw.publicKey,
//         LAMPORTS_PER_SOL,
//     );
//     console.log("Airdrop signature:", airdropSignature);
// } catch (e) {
//     console.log("Could not request airdrop:", e)
// }

// Create the Collection NFT.
console.log("Generating NFT...")
const collectionMint = generateSigner(umi)
fs.writeFileSync('./configs/collectionMint.json', JSON.stringify(collectionMint, null, 2))

const tx = await createNft(umi, {
    mint: collectionMint,
    name: 'MY-NFT-COLLECTION',
    uri: 'MY-METADATA-URI',
    sellerFeeBasisPoints: percentAmount(9.99, 2), // 9.99%
    isCollection: true,
    printSupply: printSupply('Unlimited'),
    TokenStandard: TokenStandard.NonFungible,
}).sendAndConfirm(umi)
console.log("Created NFT at:", bs58.encode(tx.signature))