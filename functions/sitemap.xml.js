import { jsonResponse } from '../_utils';

// 生成sitemap.xml
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const db = env.DB;
    const posts = await db.prepare(`
      SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY created_at DESC
    `).all();

    // 获取站点设置
    const siteTitle = await db.prepare("SELECT value FROM settings WHERE key = 'site_title'").first();
    const baseUrl = new URL(context.request.url).origin;

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

    posts.results.forEach(post => {
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
