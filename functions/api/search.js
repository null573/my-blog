import { jsonResponse, errorResponse } from '../_utils';

// 搜索文章
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  if (!q.trim()) {
    return jsonResponse({ posts: [], total: 0, page, limit, totalPages: 0 });
  }

  try {
    const db = env.DB;
    const searchTerm = `%${q}%`;

    const posts = await db.prepare(`
      SELECT id, title, slug, summary, views, created_at
      FROM posts
      WHERE status = 'published' AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(searchTerm, searchTerm, searchTerm, limit, offset).all();

    const totalResult = await db.prepare(`
      SELECT COUNT(*) as total FROM posts
      WHERE status = 'published' AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)
    `).bind(searchTerm, searchTerm, searchTerm).first();

    return jsonResponse({
      posts: posts.results,
      total: totalResult.total,
      page,
      limit,
      totalPages: Math.ceil(totalResult.total / limit),
      query: q
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
