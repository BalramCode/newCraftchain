export async function generateMetadata({ params }) {
  const { id } = await params
  
  try {
    if (!process.env.MONGODB_URI) return { title: 'Product' }
    const { MongoClient, ObjectId } = require('mongodb')
    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    const db = client.db('craftchain')
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) })
    await client.close()

    if (!product) {
      return { title: 'Product Not Found' }
    }

    const title = product.name
    const description = product.description || `Authentic ${product.category} handcrafted in India.`
    const image = product.images?.[0] || 'https://new-craftchain.vercel.app/logo.png'

    return {
      title,
      description,
      openGraph: {
        title: `${title} | CraftChain`,
        description,
        images: [image],
        type: 'website',
      },
      alternates: {
        canonical: `https://new-craftchain.vercel.app/products/${id}`,
      },
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return { title: 'Product' }
  }
}

export default async function ProductLayout({ children, params }) {
  const { id } = await params
  let product = null;
  try {
    if (process.env.MONGODB_URI) {
      const { MongoClient, ObjectId } = require('mongodb')
      const client = new MongoClient(process.env.MONGODB_URI)
      await client.connect()
      const db = client.db('craftchain')
      product = await db.collection('products').findOne({ _id: new ObjectId(id) })
      await client.close()
    }
  } catch(e) {}

  return (
    <>
      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              image: product.images?.[0],
              description: product.description,
              offers: {
                "@type": "Offer",
                url: `https://new-craftchain.vercel.app/products/${id}`,
                priceCurrency: "INR",
                price: product.price,
                availability: (product.stock > 0 || product.inventory > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
              }
            })
          }}
        />
      )}
      {children}
    </>
  )
}
