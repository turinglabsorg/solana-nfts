import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCandyMachine, addConfigLines } from '@metaplex-foundation/mpl-candy-machine'
import { networks } from './constants/networks.js'
import { keypairIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import fs from 'fs'
import bs58 from 'bs58'
import {
    fetchCandyMachine,
    fetchCandyGuard,
} from '@metaplex-foundation/mpl-candy-machine'
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

// Create candy machine
const candyMachineDetails = JSON.parse(fs.readFileSync('./configs/candyMachine.json', 'utf-8'))
const candyMachine = await fetchCandyMachine(umi, candyMachineDetails.publicKey)
const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority)
console.log("Candy machine:", candyMachine)
console.log("Candy guard:", candyGuard)

// Mint NFT
const ipfs = "https://bafkreie4dfdksfyam3kdywwzyj34cquu2rjdn6qtmcwenajfg2mui6mpvy.ipfs.nftstorage.link"
console.log("Items loaded:", candyMachine.itemsLoaded)
await addConfigLines(umi, {
    candyMachine: candyMachine.publicKey,
    index: candyMachine.itemsLoaded,
    configLines: [
        { name: 'CANDY NFT ##$ID+1$', prefixUri: ipfs },
    ],
}).sendAndConfirm(umi).then((tx) => {
    console.log("Minted NFT:", tx)
    console.log("Signature:", tx.signature);
})