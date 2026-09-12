import { jsonResponse, errorResponse, verifyAuth, hashPassword, updateAdminPassword } from '../../_utils';

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

    const oldHash = await hashPassword(oldPassword);
    const adminData = await env.BLOG_KV.get('admin:user', { type: 'json' });

    if (!adminData || adminData.password_hash !== oldHash) {
      return errorResponse('旧密码错误', 400);
    }

    const newHash = await hashPassword(newPassword);
    await updateAdminPassword(env, admin.id, newHash);

    return jsonResponse({ message: '密码修改成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
