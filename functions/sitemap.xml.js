import { jsonResponse, getPostsList, getSettings } from './_utils';

// 生成sitemap.xml
export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    const result = await getPostsList(env, 'published', 1, 1000);
    const posts = result.posts;

    const baseUrl = new URL(request.url).origin;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/search.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

    posts.forEach(post => {
      const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : '';
      xml += `
  <url>
    <loc>${baseUrl}/post.html?slug=${post.slug}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    xml += '\n</urlset>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}
