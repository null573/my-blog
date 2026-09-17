import { jsonResponse, errorResponse, verifyAuth, generateId } from '../_utils';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const contentTypeHeader = request.headers.get('Content-Type') || '';
    let file;
    let contentType = '';

    if (contentTypeHeader.includes('multipart/form-data')) {
      const form = await request.formData();
      file = form.get('file');
      if (!file || typeof file.arrayBuffer !== 'function') {
        return errorResponse('请选择图片文件', 400);
      }
      contentType = file.type || '';
    } else {
      contentType = contentTypeHeader.split(';')[0].trim();
      file = {
        arrayBuffer: () => request.arrayBuffer(),
        name: 'image'
      };
    }

    if (!ALLOWED_TYPES[contentType]) {
      return errorResponse('仅支持 JPG、PNG、GIF、WebP 图片', 400);
    }

    const buffer = await file.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return errorResponse('图片内容为空', 400);
    }
    if (buffer.byteLength > MAX_BYTES) {
      return errorResponse('图片不能超过 2MB', 400);
    }

    const id = generateId();
    await env.BLOG_KV.put(`media:${id}`, buffer, {
      metadata: { contentType, size: buffer.byteLength }
    });

    return jsonResponse({
      id,
      url: `/api/media/${id}`,
      contentType,
      size: buffer.byteLength
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
