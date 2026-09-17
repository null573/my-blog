import { errorResponse } from '../../_utils';

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id || '';

  if (!/^[a-z0-9]+$/i.test(id)) {
    return errorResponse('无效的图片 ID', 400);
  }

  try {
    const result = await env.BLOG_KV.getWithMetadata(`media:${id}`, { type: 'arrayBuffer' });
    if (!result || !result.value) {
      return errorResponse('图片不存在', 404);
    }

    const contentType = (result.metadata && result.metadata.contentType) || 'application/octet-stream';
    return new Response(result.value, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
