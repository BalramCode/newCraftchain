export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://new-craftchain.vercel.app/sitemap.xml',
  }
}
