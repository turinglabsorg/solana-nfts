import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import { networks } from './constants/networks.js'
import { publicKey, keypairIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { generateSigner, some, none, percentAmount } from '@metaplex-foundation/umi'
import { createNft, TokenStandard, printSupply } from '@metaplex-foundation/mpl-token-metadata'
import fs from 'fs'
import bs58 from 'bs58'
import { fetchAllDigitalAssetByOwner } from '@metaplex-foundation/mpl-token-metadata'

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

const owner = "548qGg85DJGogVkiw7DuSDPnuBHG8EvoMwt7gU2tz1Vn"
const assetsByOwner = await fetchAllDigitalAssetByOwner(umi, owner)

for (const asset of assetsByOwner) {
    console.log("Asset id:", asset.edition?.parent)
}