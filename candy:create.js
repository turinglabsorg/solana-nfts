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
console.log("Generating collection NFT...")
const collectionUpdateAuthority = generateSigner(umi)
const collectionMint = generateSigner(umi)
fs.writeFileSync('./configs/collectionMint.json', JSON.stringify(collectionMint, null, 2))
fs.writeFileSync('./configs/collectionUpdateAuthority.json', JSON.stringify(collectionUpdateAuthority, null, 2))

await createNft(umi, {
    mint: collectionMint,
    authority: collectionUpdateAuthority,
    name: 'UNLIMITED COLLECTION NFT',
    uri: '-',
    sellerFeeBasisPoints: percentAmount(9.99, 2), // 9.99%
    isCollection: true,
    printSupply: printSupply('Unlimited')
}).sendAndConfirm(umi).then(async tx => {
    console.log("Create Nft result", tx)
    // // Create the Candy Machine.
    console.log("Generating candy machine...")
    const candyMachine = generateSigner(umi)
    fs.writeFileSync('./configs/candyMachine.json', JSON.stringify(candyMachine, null, 2))
    let created = false
    while (!created) {
        try {
            let result = await create(umi, {
                candyMachine,
                collectionMint: collectionMint.publicKey,
                collectionUpdateAuthority,
                tokenStandard: TokenStandard.NonFungibleEdition,
                sellerFeeBasisPoints: percentAmount(5, 2), // 9.99%
                itemsAvailable: 1,
                isMutable: true,
                creators: [
                    {
                        address: umi.identity.publicKey,
                        verified: true,
                        percentageShare: 100,
                    },
                ],
                configLineSettings: some({
                    prefixName: '',
                    nameLength: 32,
                    prefixUri: '',
                    uriLength: 200,
                    isSequential: false,
                }),
            }).then(tx => tx.sendAndConfirm(umi))
            console.log(result)
            created = true
        } catch (e) {
            console.log(new Date().getTime(), e.message)
        }
    }
})