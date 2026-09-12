import { jsonResponse, errorResponse, verifyAuth } from '../../../_utils';

// 管理员删除评论
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const { id } = params;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const db = env.DB;
    const result = await db.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
    
    if (result.meta.changes === 0) {
      return errorResponse('评论不存在', 404);
    }

    return jsonResponse({ message: '删除成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 管理员审核评论（通过/拒绝）
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { id } = params;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { status } = body; // approved, pending, spam

    if (!['approved', 'pending', 'spam'].includes(status)) {
      return errorResponse('无效的状态', 400);
    }

    const db = env.DB;
    const result = await db.prepare(`
      UPDATE comments SET status = ? WHERE id = ?
    `).bind(status, id).run();

    if (result.meta.changes === 0) {
      return errorResponse('评论不存在', 404);
    }

    return jsonResponse({ message: '状态更新成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
