import { jsonResponse, errorResponse, verifyAuth, generateSummary, generateSlug } from '../_utils';

// 获取文章列表
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const status = url.searchParams.get('status') || 'published';
  const offset = (page - 1) * limit;

  try {
    const db = env.DB;
    
    // 验证是否有权限查看草稿
    const admin = await verifyAuth(request, env);
    let whereClause = "WHERE status = ?";
    let params = [status];
    
    if (!admin && status !== 'published') {
      return errorResponse('无权限查看', 403);
    }
    if (admin && status === 'all') {
      whereClause = "";
      params = [];
    }

    const posts = await db.prepare(`
      SELECT id, title, slug, summary, cover_image, status, allow_comments, views, created_at, updated_at
      FROM posts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    const totalResult = await db.prepare(`
      SELECT COUNT(*) as total FROM posts ${whereClause}
    `).bind(...params).first();

    return jsonResponse({
      posts: posts.results,
      total: totalResult.total,
      page,
      limit,
      totalPages: Math.ceil(totalResult.total / limit)
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 创建文章
export async function onRequestPost(context) {
  const { request, env } = context;
  
  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { title, content, status = 'published', allow_comments = 1, cover_image = '', slug: customSlug } = body;

    if (!title || !content) {
      return errorResponse('标题和内容不能为空', 400);
    }

    const slug = customSlug || generateSlug(title);
    const summary = generateSummary(content);

    const db = env.DB;
    const result = await db.prepare(`
      INSERT INTO posts (title, slug, content, summary, cover_image, status, allow_comments)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(title, slug, content, summary, cover_image, status, allow_comments ? 1 : 0).run();

    return jsonResponse({
      id: result.meta.last_row_id,
      slug,
      message: '发布成功'
    }, 201);
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed')) {
      return errorResponse('URL别名已存在，请修改标题或自定义别名', 400);
    }
    return errorResponse(e.message, 500);
  }
}
