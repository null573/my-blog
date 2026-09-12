import { jsonResponse, errorResponse, searchPosts } from '../_utils';

// 搜索文章
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  if (!q.trim()) {
    return jsonResponse({ posts: [], total: 0, page, limit, totalPages: 0, query: '' });
  }

  try {
    const result = await searchPosts(env, q, page, limit);
    return jsonResponse(result);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
