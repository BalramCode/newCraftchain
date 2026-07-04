import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { hashPassword, verifyPassword, signToken, getAuthUser } from '@/lib/auth'
import { getContract, getSigner, CONTRACT_ADDRESS, EXPLORER_URL } from '@/lib/chain'

let client, db
async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

function ok(data, status = 200) { return cors(NextResponse.json(data, { status })) }
function err(msg, status = 400) { return cors(NextResponse.json({ error: msg }, { status })) }
function clean(doc) { if (!doc) return doc; const { _id, ...rest } = doc; return rest }

export async function OPTIONS() { return cors(new NextResponse(null, { status: 200 })) }

async function handler(request, { params }) {
  const { path = [] } = await params
  const route = '/' + path.join('/')
  const method = request.method

  try {
    const db = await getDb()

    // ---------- Health / info ----------
    if (route === '/' && method === 'GET') {
      return ok({ app: 'CraftChain', contract: CONTRACT_ADDRESS, explorer: EXPLORER_URL })
    }
    if (route === '/contract-info' && method === 'GET') {
      return ok({
        address: CONTRACT_ADDRESS,
        chainId: 11155111,
        network: 'sepolia',
        explorer: EXPLORER_URL,
      })
    }

    // ---------- Auth ----------
    if (route === '/auth/register' && method === 'POST') {
      const { name, email, password, role = 'customer' } = await request.json()
      if (!name || !email || !password) return err('name, email, password required')
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) return err('Email already registered', 409)
      const user = {
        id: uuidv4(),
        name,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        role: ['customer','ngo','admin','artisan'].includes(role) ? role : 'customer',
        createdAt: new Date(),
      }
      await db.collection('users').insertOne(user)
      const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
      return ok({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
    }

    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json()
      if (!email || !password) return err('email + password required')
      const user = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (!user || !verifyPassword(password, user.passwordHash)) return err('Invalid credentials', 401)
      const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
      return ok({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
    }

    if (route === '/auth/me' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Not authenticated', 401)
      return ok({ user: u })
    }

    // ---------- Artisans ----------
    if (route === '/artisans' && method === 'GET') {
      const list = await db.collection('artisans').find({}).toArray()
      return ok(list.map(clean))
    }
    if (path[0] === 'artisans' && path.length === 2 && method === 'GET') {
      const a = await db.collection('artisans').findOne({ id: path[1] })
      if (!a) return err('Not found', 404)
      const products = await db.collection('products').find({ artisanId: a.id }).toArray()
      return ok({ ...clean(a), products: products.map(clean) })
    }
    if (route === '/artisans' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u || (u.role !== 'ngo' && u.role !== 'admin')) return err('Forbidden', 403)
      const body = await request.json()
      const artisan = {
        id: uuidv4(),
        name: body.name,
        village: body.village || '',
        district: body.district || '',
        craftType: body.craftType || '',
        userId: body.userId || null,
        createdAt: new Date(),
      }
      await db.collection('artisans').insertOne(artisan)
      return ok(clean(artisan))
    }

    // ---------- Products ----------
    if (route === '/products' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')
      const category = url.searchParams.get('category')
      const filter = {}
      if (category) filter.category = category
      if (q) filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ]
      const products = await db.collection('products').find(filter).sort({ createdAt: -1 }).toArray()
      // enrich with artisan name
      const artisanIds = [...new Set(products.map(p => p.artisanId).filter(Boolean))]
      const artisans = artisanIds.length
        ? await db.collection('artisans').find({ id: { $in: artisanIds } }).toArray()
        : []
      const aMap = Object.fromEntries(artisans.map(a => [a.id, a]))
      return ok(products.map(p => ({ ...clean(p), artisan: aMap[p.artisanId] ? clean(aMap[p.artisanId]) : null })))
    }

    if (path[0] === 'products' && path.length === 2 && method === 'GET') {
      const p = await db.collection('products').findOne({ id: path[1] })
      if (!p) return err('Not found', 404)
      const a = p.artisanId ? await db.collection('artisans').findOne({ id: p.artisanId }) : null
      return ok({ ...clean(p), artisan: a ? clean(a) : null })
    }

    if (route === '/products' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u || (u.role !== 'ngo' && u.role !== 'admin')) return err('Only NGO/admin can register products', 403)
      const body = await request.json()
      const { name, price, images = [], materials = '', description = '', category = 'General', artisan = {} } = body
      if (!name || !price) return err('name and price required')

      // upsert artisan
      let artisanDoc = null
      if (artisan.id) {
        artisanDoc = await db.collection('artisans').findOne({ id: artisan.id })
      }
      if (!artisanDoc && artisan.name) {
        artisanDoc = {
          id: uuidv4(),
          name: artisan.name,
          village: artisan.village || '',
          district: artisan.district || '',
          craftType: artisan.craftType || category,
          userId: null,
          createdAt: new Date(),
        }
        await db.collection('artisans').insertOne(artisanDoc)
      }

      // Build tokenURI metadata (data URI to keep it free/no IPFS pinning cost)
      const metadata = {
        name,
        description,
        image: images[0] || '',
        images,
        attributes: [
          { trait_type: 'Category', value: category },
          { trait_type: 'Material', value: materials },
          { trait_type: 'Artisan', value: artisanDoc?.name || 'Unknown' },
          { trait_type: 'Village', value: artisanDoc?.village || '' },
          { trait_type: 'District', value: artisanDoc?.district || '' },
        ],
      }
      const tokenURI = 'data:application/json;base64,' + Buffer.from(JSON.stringify(metadata)).toString('base64')

      // Mint on-chain
      const contract = getContract(true)
      const signer = getSigner()
      // artisan wallet: we use the signer address as a placeholder for provenance (Phase1)
      const artisanAddr = signer.address
      const tx = await contract.mintProduct(artisanAddr, tokenURI)
      const receipt = await tx.wait()
      // Parse ProductMinted event to find tokenId
      let tokenId = null
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log)
          if (parsed && parsed.name === 'ProductMinted') {
            tokenId = Number(parsed.args.tokenId)
            break
          }
        } catch (_) {}
      }
      if (tokenId === null) {
        // fallback: read totalMinted
        tokenId = Number(await contract.totalMinted())
      }

      const product = {
        id: uuidv4(),
        name,
        price: Number(price),
        images,
        materials,
        description,
        category,
        artisanId: artisanDoc?.id || null,
        tokenId,
        contractAddress: CONTRACT_ADDRESS,
        mintTxHash: tx.hash,
        currentOwnerAddress: signer.address,
        mintedAt: new Date(),
        createdAt: new Date(),
      }
      await db.collection('products').insertOne(product)
      return ok({ ...clean(product), artisan: artisanDoc ? clean(artisanDoc) : null })
    }

    // ---------- Verify (LIVE ON-CHAIN) ----------
    if (path[0] === 'verify' && path.length === 2 && method === 'GET') {
      const tokenId = path[1]
      try {
        const contract = getContract(false)
        const result = await contract.verifyProduct(tokenId)
        // result: [owner, artisan, timestamp, tokenURI]
        const owner = result[0]
        const artisanAddr = result[1]
        const timestamp = Number(result[2])
        const uri = result[3]
        let metadata = null
        if (uri && uri.startsWith('data:application/json;base64,')) {
          const b64 = uri.slice('data:application/json;base64,'.length)
          try { metadata = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8')) } catch(_) {}
        }
        // Also fetch DB record for extra context (optional)
        const dbProduct = await db.collection('products').findOne({ tokenId: Number(tokenId), contractAddress: CONTRACT_ADDRESS })
        return ok({
          authentic: true,
          tokenId: Number(tokenId),
          contractAddress: CONTRACT_ADDRESS,
          currentOwner: owner,
          artisanAddress: artisanAddr,
          mintTimestamp: timestamp,
          mintDate: new Date(timestamp * 1000).toISOString(),
          tokenURI: uri,
          metadata,
          explorerUrl: `${EXPLORER_URL}/token/${CONTRACT_ADDRESS}?a=${tokenId}`,
          product: dbProduct ? clean(dbProduct) : null,
        })
      } catch (e) {
        return ok({ authentic: false, tokenId: Number(tokenId), reason: 'Token does not exist on chain', error: e.shortMessage || e.message })
      }
    }

    // ---------- Orders ----------
    if (route === '/orders' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Login required', 401)
      const { productId, buyerWalletAddress } = await request.json()
      if (!productId) return err('productId required')
      const product = await db.collection('products').findOne({ id: productId })
      if (!product) return err('Product not found', 404)
      if (product.tokenId == null) return err('Product not minted', 400)

      // Determine destination address:
      // - If buyer supplied a wallet, transfer to them
      // - Otherwise keep NFT in custody (backend wallet) but record the sale
      const signer = getSigner()
      const contract = getContract(true)

      let transferTxHash = null
      let newOwner = signer.address
      const validAddr = buyerWalletAddress && /^0x[a-fA-F0-9]{40}$/.test(buyerWalletAddress)
      if (validAddr) {
        const tx = await contract.transferProduct(product.tokenId, buyerWalletAddress)
        await tx.wait()
        transferTxHash = tx.hash
        newOwner = buyerWalletAddress
      }

      const order = {
        id: uuidv4(),
        userId: u.id,
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0] || '',
        price: product.price,
        status: 'paid',
        buyerWalletAddress: validAddr ? buyerWalletAddress : null,
        transferTxHash,
        tokenId: product.tokenId,
        contractAddress: product.contractAddress,
        createdAt: new Date(),
      }
      await db.collection('orders').insertOne(order)

      // Update product owner (custodial or buyer)
      await db.collection('products').updateOne(
        { id: product.id },
        { $set: { currentOwnerAddress: newOwner, buyerUserId: u.id } }
      )

      return ok(clean(order))
    }

    if (route === '/orders' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Login required', 401)
      const orders = await db.collection('orders').find({ userId: u.id }).sort({ createdAt: -1 }).toArray()
      return ok(orders.map(clean))
    }

    if (path[0] === 'users' && path.length === 3 && path[2] === 'orders' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Login required', 401)
      // allow self only in Phase 1
      if (u.id !== path[1] && u.role !== 'admin') return err('Forbidden', 403)
      const orders = await db.collection('orders').find({ userId: path[1] }).sort({ createdAt: -1 }).toArray()
      return ok(orders.map(clean))
    }

    return err(`Route ${route} not found`, 404)
  } catch (e) {
    console.error('API Error', e)
    return err(e.shortMessage || e.message || 'Internal error', 500)
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
