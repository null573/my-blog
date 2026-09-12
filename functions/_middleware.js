export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  if (path.startsWith('/api/') || path === '/sitemap.xml' || path.startsWith('/cdn-cgi/')) {
    return context.next();
  }

  if (path.includes('.')) {
    return context.next();
  }

  if (!context.env.ASSETS) {
    return context.next();
  }

  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = path.endsWith('/') ? `${path}index.html` : `${path}.html`;

  const assetResponse = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), context.request));
  if (assetResponse && assetResponse.status !== 404) {
    return assetResponse;
  }

  return context.next();
}
