import { jsonResponse, errorResponse, verifyAuth, generateSummary, generateSlug } from '../_utils';

// 获取单篇文章
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const { slug } = params;

  try {
    const db = env.DB;
    const post = await db.prepare(`
      SELECT * FROM posts WHERE slug = ?
    `).bind(slug).first();

    if (!post) {
      return errorResponse('文章不存在', 404);
    }

    // 草稿只有管理员可见
    const admin = await verifyAuth(request, env);
    if (post.status === 'draft' && !admin) {
      return errorResponse('文章不存在', 404);
    }

    // 增加阅读量（不记录管理员自己的访问）
    if (!admin) {
      await db.prepare(`
        UPDATE posts SET views = views + 1 WHERE id = ?
      `).bind(post.id).run();
      post.views += 1;
    }

    return jsonResponse({ post });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 更新文章
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { slug } = params;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { title, content, status, allow_comments, cover_image, slug: newSlug } = body;

    const db = env.DB;
    const existing = await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first();
    if (!existing) {
      return errorResponse('文章不存在', 404);
    }

    const finalSlug = newSlug || (title ? generateSlug(title) : slug);
    const summary = content ? generateSummary(content) : null;

    const fields = [];
    const values = [];
    
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (content !== undefined) { fields.push('content = ?'); values.push(content); }
    if (summary !== null) { fields.push('summary = ?'); values.push(summary); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (allow_comments !== undefined) { fields.push('allow_comments = ?'); values.push(allow_comments ? 1 : 0); }
    if (cover_image !== undefined) { fields.push('cover_image = ?'); values.push(cover_image); }
    if (newSlug !== undefined) { fields.push('slug = ?'); values.push(finalSlug); }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(slug);

    await db.prepare(`
      UPDATE posts SET ${fields.join(', ')} WHERE slug = ?
    `).bind(...values).run();

    return jsonResponse({ message: '更新成功', slug: finalSlug });
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed')) {
      return errorResponse('URL别名已存在', 400);
    }
    return errorResponse(e.message, 500);
  }
}

// 删除文章
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const { slug } = params;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const db = env.DB;
    const result = await db.prepare('DELETE FROM posts WHERE slug = ?').bind(slug).run();
    
    if (result.meta.changes === 0) {
      return errorResponse('文章不存在', 404);
    }

    return jsonResponse({ message: '删除成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
