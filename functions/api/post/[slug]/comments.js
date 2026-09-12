import { jsonResponse, errorResponse, verifyAuth, getClientIP } from '../../_utils';

// 获取评论列表
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const { slug } = params;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    const db = env.DB;
    const post = await db.prepare('SELECT id, allow_comments FROM posts WHERE slug = ?').bind(slug).first();
    
    if (!post) {
      return errorResponse('文章不存在', 404);
    }

    const admin = await verifyAuth(request, env);
    let statusFilter = "status = 'approved'";
    if (admin) {
      statusFilter = "1=1"; // 管理员看所有
    }

    const comments = await db.prepare(`
      SELECT id, author_name, content, status, created_at
      FROM comments
      WHERE post_id = ? AND ${statusFilter}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(post.id, limit, offset).all();

    const totalResult = await db.prepare(`
      SELECT COUNT(*) as total FROM comments WHERE post_id = ? AND ${statusFilter}
    `).bind(post.id).first();

    return jsonResponse({
      comments: comments.results,
      total: totalResult.total,
      allow_comments: post.allow_comments === 1
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 发表评论
export async function onRequestPost(context) {
  const { request, env, params } = context;
  const { slug } = params;

  try {
    const body = await request.json();
    const { author_name = '匿名', author_email = '', content } = body;

    if (!content || !content.trim()) {
      return errorResponse('评论内容不能为空', 400);
    }

    if (content.length > 2000) {
      return errorResponse('评论内容不能超过2000字', 400);
    }

    const db = env.DB;
    const post = await db.prepare('SELECT id, allow_comments, status FROM posts WHERE slug = ?').bind(slug).first();
    
    if (!post || post.status !== 'published') {
      return errorResponse('文章不存在', 404);
    }

    if (post.allow_comments !== 1) {
      return errorResponse('该文章已关闭评论', 403);
    }

    const ip = getClientIP(request);
    
    // 检查是否需要审核
    const moderationSetting = await db.prepare("SELECT value FROM settings WHERE key = 'comments_moderation'").first();
    const needsModeration = moderationSetting && moderationSetting.value === '1';
    const status = needsModeration ? 'pending' : 'approved';

    const result = await db.prepare(`
      INSERT INTO comments (post_id, author_name, author_email, content, ip_address, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(post.id, author_name.substring(0, 50), author_email.substring(0, 100), content.substring(0, 2000), ip, status).run();

    return jsonResponse({
      id: result.meta.last_row_id,
      message: needsModeration ? '评论提交成功，等待审核' : '评论发表成功',
      status
    }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
