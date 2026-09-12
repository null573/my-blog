import { jsonResponse, errorResponse, hashPassword, generateToken, verifyAuth } from '../_utils';

// 管理员登录
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return errorResponse('用户名和密码不能为空', 400);
    }

    const db = env.DB;
    
    // 检查是否有管理员账号
    const adminCount = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
    
    // 如果没有管理员，创建默认管理员
    if (adminCount.count === 0) {
      const defaultPassword = 'admin123';
      const passwordHash = await hashPassword(defaultPassword);
      await db.prepare(`
        INSERT INTO admins (username, password_hash) VALUES ('admin', ?)
      `).bind(passwordHash).run();
    }

    const passwordHash = await hashPassword(password);
    const admin = await db.prepare(`
      SELECT id, username FROM admins WHERE username = ? AND password_hash = ?
    `).bind(username, passwordHash).first();

    if (!admin) {
      return errorResponse('用户名或密码错误', 401);
    }

    // 生成会话token
    const token = generateToken();
    await env.BLOG_KV.put(`session:${token}`, JSON.stringify({
      id: admin.id,
      username: admin.username,
      loginAt: Date.now()
    }), { expirationTtl: 60 * 60 * 24 * 7 }); // 7天有效期

    return jsonResponse({
      token,
      username: admin.username,
      message: '登录成功'
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
