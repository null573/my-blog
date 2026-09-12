import { jsonResponse, errorResponse, verifyAuth, hashPassword } from '../../_utils';

// 修改密码
export async function onRequestPost(context) {
  const { request, env } = context;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return errorResponse('旧密码和新密码不能为空', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse('新密码至少6位', 400);
    }

    const db = env.DB;
    const oldHash = await hashPassword(oldPassword);
    const existing = await db.prepare(`
      SELECT id FROM admins WHERE id = ? AND password_hash = ?
    `).bind(admin.id, oldHash).first();

    if (!existing) {
      return errorResponse('旧密码错误', 400);
    }

    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newHash, admin.id).run();

    return jsonResponse({ message: '密码修改成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
