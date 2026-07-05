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
function decodeTokenMetadata(tokenURI) {
  if (!tokenURI || typeof tokenURI !== 'string') return { metadata: null, ipfsCid: null }
  let ipfsCid = null
  if (tokenURI.startsWith('ipfs://')) ipfsCid = tokenURI.replace('ipfs://', '').split('/')[0]
  if (!tokenURI.startsWith('data:application/json;base64,')) return { metadata: null, ipfsCid }
  try {
    const b64 = tokenURI.slice('data:application/json;base64,'.length)
    return { metadata: JSON.parse(Buffer.from(b64, 'base64').toString('utf-8')), ipfsCid }
  } catch (_) {
    return { metadata: null, ipfsCid }
  }
}

function asNumber(value) {
  if (value == null) return null
  return Number(typeof value === 'bigint' ? value : value.toString ? value.toString() : value)
}

function withTimeout(promise, label, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ])
}

const EXPLORER_LIMIT_DEFAULT = 10
const EXPLORER_LIMIT_MAX = 50
const EXPLORER_CHUNK_SIZE = Number(process.env.EXPLORER_BLOCK_CHUNK_SIZE || 750)
const EXPLORER_MAX_BLOCKS_PER_REQUEST = Number(process.env.EXPLORER_MAX_BLOCKS_PER_REQUEST || 3000)
let explorerIndexesReady = false
let explorerIndexPromise = null

function clampPage(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

function clampLimit(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return EXPLORER_LIMIT_DEFAULT
  return Math.min(Math.floor(n), EXPLORER_LIMIT_MAX)
}

async function ensureExplorerIndexes(db) {
  if (explorerIndexesReady) return
  await Promise.all([
    db.collection('explorerEvents').createIndex({ id: 1 }, { unique: true }),
    db.collection('explorerEvents').createIndex({ contractAddress: 1, blockNumber: -1, logIndex: -1 }),
    db.collection('explorerEvents').createIndex({ contractAddress: 1, txHash: 1 }),
    db.collection('explorerEvents').createIndex({ contractAddress: 1, tokenId: 1 }),
    db.collection('explorerEvents').createIndex({ searchText: 'text' }),
    db.collection('explorerBlocks').createIndex({ blockNumber: 1 }, { unique: true }),
    db.collection('explorerTransactions').createIndex({ txHash: 1 }, { unique: true }),
    db.collection('explorerState').createIndex({ contractAddress: 1 }, { unique: true }),
  ])
  explorerIndexesReady = true
}

async function getContractLogs(provider, fromBlock, toBlock) {
  try {
    return await withTimeout(provider.getLogs({ address: CONTRACT_ADDRESS, fromBlock, toBlock }), `Log scan ${fromBlock}-${toBlock}`, 15000)
  } catch (e) {
    if (fromBlock >= toBlock) return []
    const mid = Math.floor((fromBlock + toBlock) / 2)
    const [left, right] = await Promise.all([
      getContractLogs(provider, fromBlock, mid),
      getContractLogs(provider, mid + 1, toBlock),
    ])
    return [...left, ...right]
  }
}

async function runExplorerIndex(db) {
  if (!explorerIndexPromise) {
    explorerIndexPromise = indexExplorerEvents(db).finally(() => { explorerIndexPromise = null })
  }
  return explorerIndexPromise
}

async function getCachedBlocks(db, provider, blockNumbers) {
  const unique = [...new Set(blockNumbers.filter(Number.isFinite))]
  if (!unique.length) return {}
  const cached = await db.collection('explorerBlocks').find({ blockNumber: { $in: unique } }).toArray()
  const map = Object.fromEntries(cached.map(b => [b.blockNumber, b]))
  const missing = unique.filter(b => !map[b])
  if (missing.length) {
    const fetched = await Promise.all(missing.map(async blockNumber => {
      try {
        const block = await withTimeout(provider.getBlock(blockNumber), `Block ${blockNumber} lookup`)
        return block ? { blockNumber, timestamp: block.timestamp || 0, hash: block.hash || null, indexedAt: new Date() } : null
      } catch {
        return { blockNumber, timestamp: 0, hash: null, indexedAt: new Date() }
      }
    }))
    await Promise.all(fetched.filter(Boolean).map(block =>
      db.collection('explorerBlocks').updateOne({ blockNumber: block.blockNumber }, { $set: block }, { upsert: true })
    ))
    for (const block of fetched.filter(Boolean)) map[block.blockNumber] = block
  }
  return map
}

async function getCachedTransactions(db, provider, txHashes) {
  const unique = [...new Set(txHashes.filter(Boolean))]
  if (!unique.length) return {}
  const cached = await db.collection('explorerTransactions').find({ txHash: { $in: unique } }).toArray()
  const map = Object.fromEntries(cached.map(tx => [tx.txHash, tx]))
  const missing = unique.filter(h => !map[h])
  if (missing.length) {
    const fetched = await Promise.all(missing.map(async txHash => {
      try {
        const [tx, receipt] = await Promise.all([
          withTimeout(provider.getTransaction(txHash), `Transaction ${txHash} lookup`),
          withTimeout(provider.getTransactionReceipt(txHash), `Receipt ${txHash} lookup`),
        ])
        return {
          txHash,
          from: tx?.from || null,
          to: tx?.to || null,
          blockNumber: tx?.blockNumber || receipt?.blockNumber || null,
          blockHash: tx?.blockHash || null,
          value: tx?.value?.toString() || '0',
          gasPrice: (tx?.gasPrice || receipt?.gasPrice)?.toString?.() || null,
          gasUsed: receipt?.gasUsed?.toString?.() || null,
          status: receipt?.status ?? null,
          indexedAt: new Date(),
        }
      } catch {
        return { txHash, indexedAt: new Date() }
      }
    }))
    await Promise.all(fetched.map(tx =>
      db.collection('explorerTransactions').updateOne({ txHash: tx.txHash }, { $set: tx }, { upsert: true })
    ))
    for (const tx of fetched) map[tx.txHash] = tx
  }
  return map
}

function buildSearchText(event, product, artisan) {
  return [
    event.txHash, event.type, event.eventType, event.tokenId, event.productId,
    event.from, event.to, event.artisan, event.currentOwner,
    product?.id, product?.name, product?.category, product?.ngoName, product?.registeredByName,
    artisan?.name, artisan?.village, artisan?.district, artisan?.craftType,
  ].filter(Boolean).join(' ').toLowerCase()
}

async function enrichExplorerEvents(db, events) {
  const tokenIds = [...new Set(events.map(e => e.tokenId).filter(v => v != null))]
  const products = tokenIds.length ? await db.collection('products').find({ tokenId: { $in: tokenIds }, contractAddress: CONTRACT_ADDRESS }).toArray() : []
  const pMap = Object.fromEntries(products.map(p => [p.tokenId, clean(p)]))
  const artisanIds = [...new Set(products.map(p => p.artisanId).filter(Boolean))]
  const artisans = artisanIds.length ? await db.collection('artisans').find({ id: { $in: artisanIds } }).toArray() : []
  const aMap = Object.fromEntries(artisans.map(a => [a.id, clean(a)]))

  return events.map(e => {
    const product = pMap[e.tokenId] || null
    const artisan = product?.artisanId ? aMap[product.artisanId] : null
    const uri = e.tokenURI || null
    const { metadata, ipfsCid } = decodeTokenMetadata(uri)
    const productName = product?.name || metadata?.name || e.productName || null
    const artistName = artisan?.name || metadata?.attributes?.find?.(a => a.trait_type === 'Artisan')?.value || e.artistName || null
    return {
      ...clean(e),
      productId: product?.id || e.productId || null,
      productName,
      artistName,
      ngoName: product?.ngoName || product?.registeredByName || e.ngoName || 'Registered NGO',
      currentOwner: product?.currentOwnerAddress || e.currentOwner || null,
      metadataURI: uri,
      ipfsCid: ipfsCid || e.ipfsCid || null,
      certificateHash: product?.certificateHash || e.certificateHash || null,
      verificationStatus: e.tokenId != null ? 'Verified on-chain' : e.status === 1 ? 'Confirmed' : 'Unknown',
      product: product ? { ...product, artisan, metadata, ipfsCid } : { name: productName, artisan, metadata, ipfsCid },
      explorerUrl: `${EXPLORER_URL}/tx/${e.txHash}`,
    }
  })
}

async function upsertExplorerLogs(db, provider, contract, logs) {
  if (!logs.length) return 0
  const parsedEvents = []
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log)
      if (!parsed) continue
      const argsObj = {}
      parsed.fragment.inputs.forEach((inp, i) => {
        const v = parsed.args[i]
        argsObj[inp.name] = typeof v === 'bigint' ? v.toString() : v
      })
      const tokenId = asNumber(argsObj.tokenId)
      const logIndex = log.index ?? log.logIndex ?? 0
      parsedEvents.push({
        id: `${log.transactionHash}:${logIndex}`,
        contractAddress: CONTRACT_ADDRESS,
        type: parsed.name,
        eventType: parsed.name === 'Transfer' && argsObj.from === '0x0000000000000000000000000000000000000000' ? 'NFT Mint' : parsed.name,
        tokenId,
        productId: null,
        from: argsObj.from || argsObj.previousOwner || null,
        to: argsObj.to || argsObj.newOwner || null,
        artisan: argsObj.artisan || null,
        tokenURI: argsObj.tokenURI || null,
        timestamp: asNumber(argsObj.timestamp),
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex,
        args: argsObj,
      })
    } catch(_) {}
  }
  if (!parsedEvents.length) return 0

  const [blockMap, txMap] = await Promise.all([
    getCachedBlocks(db, provider, parsedEvents.map(e => e.blockNumber)),
    getCachedTransactions(db, provider, parsedEvents.map(e => e.txHash)),
  ])
  const tokenIds = [...new Set(parsedEvents.map(e => e.tokenId).filter(v => v != null))]
  const products = tokenIds.length ? await db.collection('products').find({ tokenId: { $in: tokenIds }, contractAddress: CONTRACT_ADDRESS }).toArray() : []
  const pMap = Object.fromEntries(products.map(p => [p.tokenId, clean(p)]))
  const artisanIds = [...new Set(products.map(p => p.artisanId).filter(Boolean))]
  const artisans = artisanIds.length ? await db.collection('artisans').find({ id: { $in: artisanIds } }).toArray() : []
  const aMap = Object.fromEntries(artisans.map(a => [a.id, clean(a)]))

  await Promise.all(parsedEvents.map(e => {
    const product = pMap[e.tokenId] || null
    const artisan = product?.artisanId ? aMap[product.artisanId] : null
    const block = blockMap[e.blockNumber] || {}
    const tx = txMap[e.txHash] || {}
    const { metadata, ipfsCid } = decodeTokenMetadata(e.tokenURI)
    const productName = product?.name || metadata?.name || null
    const artistName = artisan?.name || metadata?.attributes?.find?.(a => a.trait_type === 'Artisan')?.value || null
    const doc = {
      ...e,
      blockHash: block.hash || tx.blockHash || null,
      blockTimestamp: block.timestamp || e.timestamp || null,
      gasUsed: tx.gasUsed || null,
      gasPrice: tx.gasPrice || null,
      status: tx.status ?? null,
      network: 'Sepolia',
      currentOwner: product?.currentOwnerAddress || e.to || null,
      from: e.from || tx.from || null,
      to: e.to || tx.to || null,
      productId: product?.id || null,
      productName,
      artistName,
      ngoName: product?.ngoName || product?.registeredByName || null,
      metadataURI: e.tokenURI || null,
      ipfsCid,
      certificateHash: product?.certificateHash || null,
      verificationStatus: e.tokenId != null ? 'Verified on-chain' : tx.status === 1 ? 'Confirmed' : 'Unknown',
      searchText: buildSearchText({ ...e, currentOwner: product?.currentOwnerAddress || e.to || null }, product, artisan),
      indexedAt: new Date(),
    }
    return db.collection('explorerEvents').updateOne({ id: doc.id }, { $set: doc }, { upsert: true })
  }))
  return parsedEvents.length
}

async function indexExplorerEvents(db) {
  await ensureExplorerIndexes(db)
  const contract = getContract(false)
  const provider = getProvider()
  const [latest, deployed, state] = await Promise.all([
    withTimeout(provider.getBlockNumber(), 'Latest block lookup'),
    withTimeout(getDeploymentBlock(), 'Deployment block lookup'),
    db.collection('explorerState').findOne({ contractAddress: CONTRACT_ADDRESS }),
  ])
  const deploymentBlock = deployed || 0
  const lastScannedBlock = Math.max(state?.lastScannedBlock ?? deploymentBlock - 1, deploymentBlock - 1)
  const targetBlock = Math.min(latest, lastScannedBlock + EXPLORER_MAX_BLOCKS_PER_REQUEST)
  let scannedToBlock = lastScannedBlock
  let indexedEvents = 0

  for (let fromBlock = lastScannedBlock + 1; fromBlock <= targetBlock; fromBlock += EXPLORER_CHUNK_SIZE) {
    const toBlock = Math.min(targetBlock, fromBlock + EXPLORER_CHUNK_SIZE - 1)
    const logs = await getContractLogs(provider, fromBlock, toBlock)
    indexedEvents += await upsertExplorerLogs(db, provider, contract, logs)
    scannedToBlock = toBlock
    await db.collection('explorerState').updateOne(
      { contractAddress: CONTRACT_ADDRESS },
      { $set: { contractAddress: CONTRACT_ADDRESS, deploymentBlock, latestBlock: latest, lastScannedBlock: scannedToBlock, updatedAt: new Date() } },
      { upsert: true }
    )
  }

  if (lastScannedBlock >= latest) {
    await db.collection('explorerState').updateOne(
      { contractAddress: CONTRACT_ADDRESS },
      { $set: { contractAddress: CONTRACT_ADDRESS, deploymentBlock, latestBlock: latest, updatedAt: new Date() } },
      { upsert: true }
    )
  }

  return {
    latestBlock: latest,
    deploymentBlock,
    fromBlock: deploymentBlock,
    lastScannedBlock: scannedToBlock,
    isIndexing: scannedToBlock < latest,
    indexedEvents,
  }
}

function explorerQueryFromParams(url) {
  const page = clampPage(url.searchParams.get('page'))
  const limit = clampLimit(url.searchParams.get('limit'))
  const q = (url.searchParams.get('q') || '').trim()
  const eventType = url.searchParams.get('eventType') || url.searchParams.get('eventFilter') || 'All Events'
  const status = url.searchParams.get('status') || 'all'
  const date = url.searchParams.get('date') || ''
  const block = url.searchParams.get('block') || ''
  const filter = { contractAddress: CONTRACT_ADDRESS }
  if (eventType && eventType !== 'All Events') {
    const map = {
      Mint: ['ProductMinted', 'NFT Mint'],
      Verification: ['ProductVerified'],
      'Ownership Transfer': ['OwnershipTransferred', 'Transfer'],
      'Metadata Update': ['MetadataUpdated', 'MetadataUpdate', 'MetadataUpdateBatch'],
    }
    filter.eventType = { $in: map[eventType] || [eventType] }
  }
  if (status === 'success') filter.status = 1
  if (status === 'failed') filter.status = { $ne: 1 }
  if (block && /^\d+$/.test(block.trim())) filter.blockNumber = Number(block.trim())
  if (date) {
    const start = Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1000)
    const end = start + 86400
    if (Number.isFinite(start)) filter.blockTimestamp = { $gte: start, $lt: end }
  }
  if (q) filter.searchText = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
  return { page, limit, filter, q }
}

async function fetchIndexedExplorerEvents({ db, url }) {
  await ensureExplorerIndexes(db)
  const indexState = await runExplorerIndex(db)
  const { page, limit, filter } = explorerQueryFromParams(url)
  const skip = (page - 1) * limit
  const [events, totalTransactions, totalIndexedEvents] = await Promise.all([
    db.collection('explorerEvents').find(filter).sort({ blockNumber: -1, logIndex: -1 }).skip(skip).limit(limit).toArray(),
    db.collection('explorerEvents').countDocuments(filter),
    db.collection('explorerEvents').countDocuments({ contractAddress: CONTRACT_ADDRESS }),
  ])
  const transactions = await enrichExplorerEvents(db, events)
  const totalPages = Math.max(1, Math.ceil(totalTransactions / limit))
  return {
    transactions,
    events: transactions,
    totalTransactions,
    totalIndexedEvents,
    totalEvents: totalTransactions,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    latestBlock: indexState.latestBlock,
    deploymentBlock: indexState.deploymentBlock,
    fromBlock: indexState.fromBlock,
    lastScannedBlock: indexState.lastScannedBlock,
    isIndexing: indexState.isIndexing,
    indexedThisRequest: indexState.indexedEvents,
  }
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
      const feed = await fetchIndexedExplorerEvents({ db, url })
      return ok({ ...feed, contractAddress: CONTRACT_ADDRESS, network: 'Sepolia' })
    }
    if (path[0] === 'explorer' && path[1] === 'tx' && path.length === 3 && method === 'GET') {
      const hash = path[2]
      try {
        await ensureExplorerIndexes(db)
        const [indexedTx, indexedEvents] = await Promise.all([
          db.collection('explorerTransactions').findOne({ txHash: hash }),
          db.collection('explorerEvents').find({ contractAddress: CONTRACT_ADDRESS, txHash: hash }).sort({ logIndex: 1 }).toArray(),
        ])
        if (indexedTx) {
          const block = indexedTx.blockNumber ? await db.collection('explorerBlocks').findOne({ blockNumber: indexedTx.blockNumber }) : null
          const parsedLogs = indexedEvents.map(e => ({ name: e.type, args: e.args || {} }))
          const productTokenIds = [...new Set(indexedEvents.map(e => e.tokenId).filter(v => v != null))]
          const products = productTokenIds.length ? await db.collection('products').find({ tokenId: { $in: productTokenIds }, contractAddress: CONTRACT_ADDRESS }).toArray() : []
          const artisanIds = [...new Set(products.map(p => p.artisanId).filter(Boolean))]
          const artisans = artisanIds.length ? await db.collection('artisans').find({ id: { $in: artisanIds } }).toArray() : []
          const aMap = Object.fromEntries(artisans.map(a => [a.id, clean(a)]))
          const enrichedProducts = products.map(p => {
            const artisan = p.artisanId ? aMap[p.artisanId] : null
            return { ...clean(p), artisan: artisan ? clean(artisan) : null }
          })
          return ok({
            hash: indexedTx.txHash, from: indexedTx.from, to: indexedTx.to,
            blockNumber: indexedTx.blockNumber, blockHash: indexedTx.blockHash || block?.hash || null,
            value: indexedTx.value || '0',
            gasUsed: indexedTx.gasUsed || null,
            gasPrice: indexedTx.gasPrice || null,
            status: indexedTx.status ?? null,
            timestamp: block?.timestamp || null,
            date: block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : null,
            network: 'Sepolia',
            events: parsedLogs,
            products: enrichedProducts,
            explorerUrl: `${EXPLORER_URL}/tx/${indexedTx.txHash}`,
          })
        }
        const provider = getProvider()
        const [tx, receipt] = await Promise.all([
          withTimeout(provider.getTransaction(hash), `Transaction ${hash} lookup`),
          withTimeout(provider.getTransactionReceipt(hash), `Receipt ${hash} lookup`),
        ])
        if (!tx) return err('Transaction not found', 404)
        const block = tx.blockNumber ? await withTimeout(provider.getBlock(tx.blockNumber), `Block ${tx.blockNumber} lookup`) : null
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
        const productTokenIds = [...new Set(parsedLogs.map(e => Number(e.args?.tokenId)).filter(Number.isFinite))]
        const products = productTokenIds.length ? await db.collection('products').find({ tokenId: { $in: productTokenIds }, contractAddress: CONTRACT_ADDRESS }).toArray() : []
        const artisanIds = [...new Set(products.map(p => p.artisanId).filter(Boolean))]
        const artisans = artisanIds.length ? await db.collection('artisans').find({ id: { $in: artisanIds } }).toArray() : []
        const aMap = Object.fromEntries(artisans.map(a => [a.id, clean(a)]))
        const enrichedProducts = products.map(p => {
          const artisan = p.artisanId ? aMap[p.artisanId] : null
          return { ...clean(p), artisan: artisan ? clean(artisan) : null }
        })
        return ok({
          hash: tx.hash, from: tx.from, to: tx.to,
          blockNumber: tx.blockNumber, blockHash: tx.blockHash,
          value: tx.value?.toString() || '0',
          gasUsed: receipt?.gasUsed?.toString() || null,
          gasPrice: (tx.gasPrice || receipt?.gasPrice)?.toString?.() || null,
          status: receipt?.status ?? null,
          timestamp: block?.timestamp || null,
          date: block ? new Date(block.timestamp * 1000).toISOString() : null,
          network: 'Sepolia',
          events: parsedLogs,
          products: enrichedProducts,
          explorerUrl: `${EXPLORER_URL}/tx/${tx.hash}`,
        })
      } catch (e) { return err(e.shortMessage || e.message, 500) }
    }
    if (route === '/explorer/search' && method === 'GET') {
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') || '').trim()
      if (!q) return ok({ type: 'empty' })
      await ensureExplorerIndexes(db)
      if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
        const tx = await db.collection('explorerEvents').findOne({ contractAddress: CONTRACT_ADDRESS, txHash: q })
        return tx ? ok({ type: 'tx', hash: q }) : ok({ type: 'not_found', reason: 'Transaction is not indexed yet' })
      }
      if (/^\d+$/.test(q)) {
        const tokenId = Number(q)
        const event = await db.collection('explorerEvents').findOne(
          { contractAddress: CONTRACT_ADDRESS, tokenId },
          { sort: { blockNumber: -1, logIndex: -1 } }
        )
        return event ? ok({ type: 'token', tokenId, currentOwner: event.currentOwner || event.to || null, mintTimestamp: event.blockTimestamp || event.timestamp || null }) : ok({ type: 'not_found', reason: 'Token is not indexed yet' })
      }
      const matches = await db.collection('explorerEvents')
        .find({ contractAddress: CONTRACT_ADDRESS, searchText: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })
        .sort({ blockNumber: -1, logIndex: -1 })
        .limit(10)
        .toArray()
      return ok({ type: matches.length ? 'events' : 'not_found', transactions: await enrichExplorerEvents(db, matches), totalTransactions: matches.length })
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
        const event = await db.collection('explorerEvents').findOne(
          { contractAddress: CONTRACT_ADDRESS, tokenId },
          { sort: { blockNumber: -1, logIndex: -1 } }
        )
        return event ? ok({ type: 'token', tokenId, currentOwner: event.currentOwner || event.to || null, mintTimestamp: event.blockTimestamp || event.timestamp || null }) : ok({ type: 'not_found', reason: 'Token is not indexed yet' })
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
