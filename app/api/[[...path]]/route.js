import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { hashPassword, verifyPassword, signToken, getAuthUser } from '@/lib/auth'
import { getContract, getSigner, getProvider, getDeploymentBlock, CONTRACT_ADDRESS, DEPLOYMENT_TX, EXPLORER_URL } from '@/lib/chain'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

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

// ------ Explorer helpers ------
async function fetchContractEvents({ limit = 50 } = {}) {
  const contract = getContract(false)
  const provider = getProvider()
  const latest = await provider.getBlockNumber()
  const deployed = await getDeploymentBlock()
  const fromBlock = Math.max(deployed, latest - 500) // keep total range bounded

  const { ethers } = await import('ethers')
  const mintedTopic = ethers.id('ProductMinted(uint256,address,string,uint256)')
  const transferTopic = ethers.id('OwnershipTransferred(uint256,address,address,uint256)')

  // Chunk into 10-block windows (Alchemy free tier limit) and query in parallel batches of 8
  const CHUNK = 10, BATCH = 8
  const ranges = []
  for (let s = fromBlock; s <= latest; s += CHUNK) {
    ranges.push([s, Math.min(s + CHUNK - 1, latest)])
  }
  const allLogs = []
  for (let i = 0; i < ranges.length; i += BATCH) {
    const slice = ranges.slice(i, i + BATCH)
    const results = await Promise.all(slice.flatMap(([f, t]) => [
      provider.getLogs({ address: CONTRACT_ADDRESS, topics: [mintedTopic], fromBlock: f, toBlock: t }).catch(() => []),
      provider.getLogs({ address: CONTRACT_ADDRESS, topics: [transferTopic], fromBlock: f, toBlock: t }).catch(() => []),
    ]))
    for (const arr of results) allLogs.push(...arr)
  }

  const events = []
  for (const log of allLogs) {
    try {
      const parsed = contract.interface.parseLog(log)
      if (parsed.name === 'ProductMinted') {
        events.push({ type: 'ProductMinted', tokenId: Number(parsed.args.tokenId), artisan: parsed.args.artisan,
          tokenURI: parsed.args.tokenURI, timestamp: Number(parsed.args.timestamp),
          blockNumber: log.blockNumber, txHash: log.transactionHash, logIndex: log.index })
      } else if (parsed.name === 'OwnershipTransferred') {
        events.push({ type: 'OwnershipTransferred', tokenId: Number(parsed.args.tokenId), from: parsed.args.from, to: parsed.args.to,
          timestamp: Number(parsed.args.timestamp),
          blockNumber: log.blockNumber, txHash: log.transactionHash, logIndex: log.index })
      }
    } catch(_) {}
  }
  events.sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex)
  return { events: events.slice(0, limit), latestBlock: latest, deploymentBlock: deployed, fromBlock }
}

async function handler(request, { params }) {
  const { path = [] } = await params
  const route = '/' + path.join('/')
  const method = request.method

  try {
    const db = await getDb()

    // ---------- Health / info ----------
    if (route === '/' && method === 'GET') return ok({ app: 'CraftChain', contract: CONTRACT_ADDRESS, explorer: EXPLORER_URL })
    if (route === '/contract-info' && method === 'GET') {
      return ok({ address: CONTRACT_ADDRESS, chainId: 11155111, network: 'sepolia', explorer: EXPLORER_URL, deploymentTx: DEPLOYMENT_TX })
    }

    // ---------- Upload (Cloudinary) ----------
    if (route === '/upload' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Login required', 401)
      const formData = await request.formData()
      const file = formData.get('file')
      if (!file || typeof file === 'string') return err('file required')
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'craftchain', resource_type: 'image' },
          (e, r) => e ? reject(e) : resolve(r)
        ).end(buffer)
      })
      return ok({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height })
    }

    // ---------- Auth ----------
    if (route === '/auth/register' && method === 'POST') {
      const { name, email, password, role = 'customer' } = await request.json()
      if (!name || !email || !password) return err('name, email, password required')
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) return err('Email already registered', 409)
      const user = { id: uuidv4(), name, email: email.toLowerCase(), passwordHash: hashPassword(password),
        role: ['customer','ngo','admin','artisan'].includes(role) ? role : 'customer', createdAt: new Date() }
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

    // ---------- Products ----------
    if (route === '/products' && method === 'GET') {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')
      const category = url.searchParams.get('category')
      const filter = {}
      if (category) filter.category = category
      if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }]
      const products = await db.collection('products').find(filter).sort({ createdAt: -1 }).toArray()
      const artisanIds = [...new Set(products.map(p => p.artisanId).filter(Boolean))]
      const artisans = artisanIds.length ? await db.collection('artisans').find({ id: { $in: artisanIds } }).toArray() : []
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

      let artisanDoc = null
      if (artisan.id) artisanDoc = await db.collection('artisans').findOne({ id: artisan.id })
      if (!artisanDoc && artisan.name) {
        artisanDoc = { id: uuidv4(), name: artisan.name, village: artisan.village || '', district: artisan.district || '',
          craftType: artisan.craftType || category, userId: null, createdAt: new Date() }
        await db.collection('artisans').insertOne(artisanDoc)
      }

      const metadata = { name, description, image: images[0] || '', images,
        attributes: [
          { trait_type: 'Category', value: category },
          { trait_type: 'Material', value: materials },
          { trait_type: 'Artisan', value: artisanDoc?.name || 'Unknown' },
          { trait_type: 'Village', value: artisanDoc?.village || '' },
          { trait_type: 'District', value: artisanDoc?.district || '' },
        ] }
      const tokenURI = 'data:application/json;base64,' + Buffer.from(JSON.stringify(metadata)).toString('base64')

      const contract = getContract(true)
      const signer = getSigner()
      const artisanAddr = signer.address
      const tx = await contract.mintProduct(artisanAddr, tokenURI)
      const receipt = await tx.wait()
      let tokenId = null
      for (const log of receipt.logs) {
        try { const parsed = contract.interface.parseLog(log)
          if (parsed && parsed.name === 'ProductMinted') { tokenId = Number(parsed.args.tokenId); break } } catch (_) {}
      }
      if (tokenId === null) tokenId = Number(await contract.totalMinted())

      const product = { id: uuidv4(), name, price: Number(price), images, materials, description, category,
        artisanId: artisanDoc?.id || null, tokenId, contractAddress: CONTRACT_ADDRESS,
        mintTxHash: tx.hash, currentOwnerAddress: signer.address, mintedAt: new Date(), createdAt: new Date() }
      await db.collection('products').insertOne(product)
      return ok({ ...clean(product), artisan: artisanDoc ? clean(artisanDoc) : null })
    }

    // ---------- Verify (LIVE ON-CHAIN) ----------
    if (path[0] === 'verify' && path.length === 2 && method === 'GET') {
      const tokenId = path[1]
      try {
        const contract = getContract(false)
        const result = await contract.verifyProduct(tokenId)
        const owner = result[0], artisanAddr = result[1], timestamp = Number(result[2]), uri = result[3]
        let metadata = null
        if (uri && uri.startsWith('data:application/json;base64,')) {
          const b64 = uri.slice('data:application/json;base64,'.length)
          try { metadata = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8')) } catch(_) {}
        }
        const dbProduct = await db.collection('products').findOne({ tokenId: Number(tokenId), contractAddress: CONTRACT_ADDRESS })
        return ok({
          authentic: true, tokenId: Number(tokenId), contractAddress: CONTRACT_ADDRESS,
          currentOwner: owner, artisanAddress: artisanAddr,
          mintTimestamp: timestamp, mintDate: new Date(timestamp * 1000).toISOString(),
          tokenURI: uri, metadata, explorerUrl: `${EXPLORER_URL}/token/${CONTRACT_ADDRESS}?a=${tokenId}`,
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
      const order = { id: uuidv4(), userId: u.id, productId: product.id, productName: product.name,
        productImage: product.images?.[0] || '', price: product.price, status: 'paid',
        buyerWalletAddress: validAddr ? buyerWalletAddress : null,
        transferTxHash, tokenId: product.tokenId, contractAddress: product.contractAddress, createdAt: new Date() }
      await db.collection('orders').insertOne(order)
      await db.collection('products').updateOne({ id: product.id }, { $set: { currentOwnerAddress: newOwner, buyerUserId: u.id } })
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
      if (u.id !== path[1] && u.role !== 'admin') return err('Forbidden', 403)
      const orders = await db.collection('orders').find({ userId: path[1] }).sort({ createdAt: -1 }).toArray()
      return ok(orders.map(clean))
    }

    // ---------- Certificates (customer's owned NFTs) ----------
    if (route === '/certificates/me' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Login required', 401)
      const orders = await db.collection('orders').find({ userId: u.id, status: 'paid' }).sort({ createdAt: -1 }).toArray()
      const tokenIds = [...new Set(orders.map(o => o.tokenId))]
      const products = tokenIds.length ? await db.collection('products').find({ tokenId: { $in: tokenIds } }).toArray() : []
      const pMap = Object.fromEntries(products.map(p => [p.tokenId, p]))
      const certs = []
      for (const o of orders) {
        const p = pMap[o.tokenId]
        certs.push({
          orderId: o.id, tokenId: o.tokenId, contractAddress: o.contractAddress,
          productId: o.productId, name: o.productName, image: o.productImage, price: o.price,
          purchasedAt: o.createdAt, transferTxHash: o.transferTxHash, buyerWalletAddress: o.buyerWalletAddress,
          mintTxHash: p?.mintTxHash || null, category: p?.category || '', description: p?.description || '',
        })
      }
      return ok(certs)
    }

    // ---------- Admin stats ----------
    if (route === '/admin/stats' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u || u.role !== 'admin') return err('Admin only', 403)

      const [productsCount, usersCount, ordersCount, revenueAgg, allProducts, allOrders] = await Promise.all([
        db.collection('products').countDocuments(),
        db.collection('users').countDocuments(),
        db.collection('orders').countDocuments(),
        db.collection('orders').aggregate([{ $group: { _id: null, total: { $sum: '$price' } } }]).toArray(),
        db.collection('products').find({}).sort({ createdAt: -1 }).toArray(),
        db.collection('orders').find({}).sort({ createdAt: 1 }).toArray(),
      ])
      const revenue = revenueAgg[0]?.total || 0

      // revenue-over-time (last 14 days buckets)
      const now = new Date()
      const start = new Date(now.getTime() - 13 * 86400000)
      start.setHours(0,0,0,0)
      const buckets = []
      for (let i = 0; i < 14; i++) {
        const d = new Date(start.getTime() + i * 86400000)
        buckets.push({ date: d.toISOString().slice(5, 10), day: d.toISOString().slice(0,10), revenue: 0, orders: 0 })
      }
      for (const o of allOrders) {
        const day = new Date(o.createdAt).toISOString().slice(0,10)
        const b = buckets.find(x => x.day === day)
        if (b) { b.revenue += Number(o.price || 0); b.orders += 1 }
      }

      // category breakdown
      const catMap = {}
      for (const p of allProducts) { catMap[p.category] = (catMap[p.category] || 0) + 1 }
      const categories = Object.entries(catMap).map(([name, value]) => ({ name, value }))

      // Products table (enriched with artisan names)
      const artisanIds = [...new Set(allProducts.map(p => p.artisanId).filter(Boolean))]
      const artisans = artisanIds.length ? await db.collection('artisans').find({ id: { $in: artisanIds } }).toArray() : []
      const aMap = Object.fromEntries(artisans.map(a => [a.id, a]))
      const products = allProducts.map(p => ({ ...clean(p), artisan: aMap[p.artisanId] ? clean(aMap[p.artisanId]) : null }))

      return ok({
        kpis: { productsCount, usersCount, ordersCount, revenue },
        revenueOverTime: buckets,
        categories,
        products,
      })
    }

    // ---------- Explorer ----------
    if (route === '/explorer/feed' && method === 'GET') {
      const url = new URL(request.url)
      const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100)
      const { events, latestBlock, deploymentBlock, fromBlock } = await fetchContractEvents({ limit })
      // enrich with block timestamps (batch unique blockNumbers)
      const uniqueBlocks = [...new Set(events.map(e => e.blockNumber))]
      const provider = getProvider()
      const blockInfo = await Promise.all(uniqueBlocks.map(async b => {
        try { const bk = await provider.getBlock(b); return [b, bk?.timestamp || 0] } catch { return [b, 0] }
      }))
      const bMap = Object.fromEntries(blockInfo)
      const enriched = events.map(e => ({ ...e, blockTimestamp: bMap[e.blockNumber] || e.timestamp }))
      return ok({ events: enriched, latestBlock, deploymentBlock, fromBlock, contractAddress: CONTRACT_ADDRESS })
    }
    if (path[0] === 'explorer' && path[1] === 'tx' && path.length === 3 && method === 'GET') {
      const hash = path[2]
      try {
        const provider = getProvider()
        const [tx, receipt] = await Promise.all([provider.getTransaction(hash), provider.getTransactionReceipt(hash)])
        if (!tx) return err('Transaction not found', 404)
        const block = tx.blockNumber ? await provider.getBlock(tx.blockNumber) : null
        // parse logs against contract iface if from our contract
        const contract = getContract(false)
        const parsedLogs = []
        for (const log of receipt?.logs || []) {
          try {
            const parsed = contract.interface.parseLog(log)
            if (parsed) {
              const argsObj = {}
              parsed.fragment.inputs.forEach((inp, i) => {
                const v = parsed.args[i]
                argsObj[inp.name] = typeof v === 'bigint' ? v.toString() : v
              })
              parsedLogs.push({ name: parsed.name, args: argsObj })
            }
          } catch(_) {}
        }
        return ok({
          hash: tx.hash, from: tx.from, to: tx.to,
          blockNumber: tx.blockNumber, blockHash: tx.blockHash,
          value: tx.value?.toString() || '0',
          gasUsed: receipt?.gasUsed?.toString() || null,
          status: receipt?.status ?? null,
          timestamp: block?.timestamp || null,
          date: block ? new Date(block.timestamp * 1000).toISOString() : null,
          events: parsedLogs,
          explorerUrl: `${EXPLORER_URL}/tx/${tx.hash}`,
        })
      } catch (e) { return err(e.shortMessage || e.message, 500) }
    }
    if (route === '/explorer/search' && method === 'GET') {
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') || '').trim()
      if (!q) return ok({ type: 'empty' })
      // tx hash?
      if (/^0x[a-fA-F0-9]{64}$/.test(q)) return ok({ type: 'tx', hash: q })
      // token id?
      if (/^\d+$/.test(q)) {
        const tokenId = Number(q)
        try {
          const contract = getContract(false)
          const r = await contract.verifyProduct(tokenId)
          return ok({ type: 'token', tokenId, currentOwner: r[0], mintTimestamp: Number(r[2]) })
        } catch (e) {
          return ok({ type: 'not_found', reason: 'Token does not exist' })
        }
      }
      return ok({ type: 'unknown', reason: 'Enter a tx hash (0x…) or a token id (number)' })
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
