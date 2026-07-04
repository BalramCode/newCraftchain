// Seed script: creates a demo NGO user, 6 artisans, and mints 6 products on-chain.
// Run with: node scripts/seed.js
require('dotenv').config()
const { MongoClient } = require('mongodb')
const { ethers } = require('ethers')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')
const path = require('path')
const contractJson = require(path.join(__dirname, '..', 'lib', 'contract', 'CraftChainNFT.json'))

const PRODUCTS = [
  {
    name: 'Handwoven Pashmina Shawl',
    price: 12500,
    category: 'Textiles',
    materials: '100% Ladakhi Pashm wool, natural dyes',
    description: 'Woven over 90 days in Kashmir using ancestral techniques. Feather-soft, warm, one-of-a-kind.',
    images: ['https://images.unsplash.com/photo-1570271088697-690b9cad46b3?w=1200'],
    artisan: { name: 'Mehboob Khan', village: 'Kanihama', district: 'Budgam, J&K', craftType: 'Pashmina Weaving' },
  },
  {
    name: 'Terracotta Bankura Horse — Pair',
    price: 3400,
    category: 'Pottery',
    materials: 'Sun-dried terracotta clay, hand-fired',
    description: 'The iconic elongated-neck horse of Bengal. Recognized as a GI-protected craft.',
    images: ['https://images.unsplash.com/photo-1674530187072-f788b7282f17?w=1200'],
    artisan: { name: 'Ashutosh Kumbhakar', village: 'Panchmura', district: 'Bankura, WB', craftType: 'Terracotta' },
  },
  {
    name: 'Blue Pottery Vase — Jaipur',
    price: 4200,
    category: 'Pottery',
    materials: 'Quartz stone powder, glass, borax, hand-glazed',
    description: 'Persian-origin turquoise pottery of Jaipur. No clay used. Painted freehand in cobalt.',
    images: ['https://images.unsplash.com/photo-1751906491847-6f6712b145af?w=1200'],
    artisan: { name: 'Kripal Singh', village: 'Sanganer', district: 'Jaipur, RJ', craftType: 'Blue Pottery' },
  },
  {
    name: 'Kashmiri Walnut Wood Carving',
    price: 8900,
    category: 'Woodcraft',
    materials: 'Aged Kashmiri walnut wood, hand-chiselled',
    description: 'A hand-carved panel with the traditional chinar-leaf motif. Takes 3–4 weeks per piece.',
    images: ['https://images.unsplash.com/photo-1765441863467-12214bb5d729?w=1200'],
    artisan: { name: 'Farooq Ahmad', village: 'Rainawari', district: 'Srinagar, J&K', craftType: 'Wood Carving' },
  },
  {
    name: 'Brass Krishna Idol — Moradabad',
    price: 6700,
    category: 'Metalcraft',
    materials: 'Sand-cast brass, hand-etched',
    description: 'Etched by hand in the “Peetal Nagri” — the brass city of India.',
    images: ['https://images.unsplash.com/photo-1726931535215-e4c6e05a2cff?w=1200'],
    artisan: { name: 'Rafiq Ansari', village: 'Peetalpura', district: 'Moradabad, UP', craftType: 'Brass Craft' },
  },
  {
    name: 'Handloom Cotton Cushion Set (4)',
    price: 2800,
    category: 'Textiles',
    materials: 'Organic Kalamkari cotton, vegetable dyes',
    description: 'Block-printed by hand in Machilipatnam. Set of four covers.',
    images: ['https://images.unsplash.com/photo-1575277340599-43db25b63b6f?w=1200'],
    artisan: { name: 'Padmavati Devi', village: 'Pedana', district: 'Krishna, AP', craftType: 'Kalamkari' },
  },
]

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider)
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractJson.abi, signer)
  console.log('Signer:', signer.address)

  const client = new MongoClient(process.env.MONGO_URL)
  await client.connect()
  const db = client.db(process.env.DB_NAME)

  // Demo NGO user
  const ngoEmail = 'ngo@craftchain.in'
  const existing = await db.collection('users').findOne({ email: ngoEmail })
  if (!existing) {
    await db.collection('users').insertOne({
      id: uuidv4(),
      name: 'Heritage NGO Trust',
      email: ngoEmail,
      passwordHash: bcrypt.hashSync('craftchain123', 8),
      role: 'ngo',
      createdAt: new Date(),
    })
    console.log('Created NGO user (ngo@craftchain.in / craftchain123)')
  }
  const customerEmail = 'buyer@craftchain.in'
  const existingC = await db.collection('users').findOne({ email: customerEmail })
  if (!existingC) {
    await db.collection('users').insertOne({
      id: uuidv4(),
      name: 'Ananya Sharma',
      email: customerEmail,
      passwordHash: bcrypt.hashSync('buyer123', 8),
      role: 'customer',
      createdAt: new Date(),
    })
    console.log('Created customer user (buyer@craftchain.in / buyer123)')
  }

  // Skip if already seeded
  const existingProducts = await db.collection('products').countDocuments()
  if (existingProducts >= PRODUCTS.length) {
    console.log(`Already have ${existingProducts} products. Skipping.`)
    await client.close()
    return
  }

  for (const p of PRODUCTS) {
    // Insert artisan
    let artisan = await db.collection('artisans').findOne({ name: p.artisan.name })
    if (!artisan) {
      artisan = { id: uuidv4(), ...p.artisan, userId: null, createdAt: new Date() }
      await db.collection('artisans').insertOne(artisan)
    }

    const metadata = {
      name: p.name,
      description: p.description,
      image: p.images[0],
      images: p.images,
      attributes: [
        { trait_type: 'Category', value: p.category },
        { trait_type: 'Material', value: p.materials },
        { trait_type: 'Artisan', value: artisan.name },
        { trait_type: 'Village', value: artisan.village },
        { trait_type: 'District', value: artisan.district },
      ],
    }
    const tokenURI = 'data:application/json;base64,' + Buffer.from(JSON.stringify(metadata)).toString('base64')

    console.log(`Minting: ${p.name} ...`)
    const tx = await contract.mintProduct(signer.address, tokenURI)
    const receipt = await tx.wait()
    let tokenId = null
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log)
        if (parsed && parsed.name === 'ProductMinted') { tokenId = Number(parsed.args.tokenId); break }
      } catch (_) {}
    }
    if (tokenId == null) tokenId = Number(await contract.totalMinted())
    console.log(`  tokenId=${tokenId}  tx=${tx.hash}`)

    await db.collection('products').insertOne({
      id: uuidv4(),
      name: p.name,
      price: p.price,
      images: p.images,
      materials: p.materials,
      description: p.description,
      category: p.category,
      artisanId: artisan.id,
      tokenId,
      contractAddress: process.env.CONTRACT_ADDRESS,
      mintTxHash: tx.hash,
      currentOwnerAddress: signer.address,
      mintedAt: new Date(),
      createdAt: new Date(),
    })
  }
  await client.close()
  console.log('Seed complete.')
}
main().catch(e => { console.error(e); process.exit(1) })
