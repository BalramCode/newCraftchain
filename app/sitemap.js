import { MongoClient } from 'mongodb'

export default async function sitemap() {
  const baseUrl = 'https://new-craftchain.vercel.app'
  
  // Define static routes
  const staticRoutes = [
    '',
    '/products',
    '/verify',
    '/cart',
    '/explorer',
    '/auth',
    '/dashboard/admin',
    '/dashboard/customer',
    '/dashboard/ngo'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1 : 0.8,
  }))

  try {
    // Fetch dynamic product routes
    if (!process.env.MONGODB_URI) {
      return staticRoutes
    }
    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    const db = client.db('craftchain')
    const products = await db.collection('products').find({}).toArray()
    await client.close()

    const productRoutes = products.map((product) => ({
      url: `${baseUrl}/products/${product._id.toString()}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    }))

    return [...staticRoutes, ...productRoutes]
  } catch (e) {
    console.error("Failed to generate sitemap for products:", e)
    return staticRoutes
  }
}
