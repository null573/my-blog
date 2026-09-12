import { jsonResponse, errorResponse, hashPassword, generateToken, initAdmin, getAdmin } from '../../_utils';

// 管理员登录
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return errorResponse('用户名和密码不能为空', 400);
    }

    // 初始化管理员账号（首次登录时）
    await initAdmin(env);

    const passwordHash = await hashPassword(password);
    const admin = await getAdmin(env, username);

    if (!admin || admin.password_hash !== passwordHash) {
      return errorResponse('用户名或密码错误', 401);
    }

    // 生成会话token
    const token = generateToken();
    await env.BLOG_KV.put(`session:${token}`, JSON.stringify({
      id: admin.id,
      username: admin.username,
      loginAt: Date.now()
    }), { expirationTtl: 60 * 60 * 24 * 7 });

    return jsonResponse({
      token,
      username: admin.username,
      message: '登录成功'
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
