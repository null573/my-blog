// 动态输出 robots.txt，sitemap 使用当前访问域名的绝对地址
export async function onRequestGet(context) {
  const { request } = context;
  const origin = new URL(request.url).origin;

  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
