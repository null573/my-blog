import { jsonResponse, errorResponse, verifyAuth } from '../../_utils';

// 更新友情链接
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { id } = params;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { name, url, description, sort_order, is_visible } = body;

    const db = env.DB;
    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (url !== undefined) { fields.push('url = ?'); values.push(url); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    if (is_visible !== undefined) { fields.push('is_visible = ?'); values.push(is_visible ? 1 : 0); }

    if (fields.length === 0) {
      return errorResponse('没有需要更新的字段', 400);
    }

    values.push(id);
    const result = await db.prepare(`
      UPDATE links SET ${fields.join(', ')} WHERE id = ?
    `).bind(...values).run();

    if (result.meta.changes === 0) {
      return errorResponse('链接不存在', 404);
    }

    return jsonResponse({ message: '更新成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 删除友情链接
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const { id } = params;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const db = env.DB;
    const result = await db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
      return errorResponse('链接不存在', 404);
    }

    return jsonResponse({ message: '删除成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
