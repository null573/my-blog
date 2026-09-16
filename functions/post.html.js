// 将旧的 /post.html?slug=xxx 链接永久重定向到 /post/xxx
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  if (slug) {
    return Response.redirect(new URL(`/post/${encodeURIComponent(slug)}`, url.origin).toString(), 301);
  }

  return Response.redirect(new URL('/', url.origin).toString(), 302);
}
