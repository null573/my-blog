import { jsonResponse, errorResponse, verifyAuth } from '../_utils';

// 获取设置
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const db = env.DB;
    const settings = await db.prepare('SELECT key, value FROM settings').all();
    
    const result = {};
    settings.results.forEach(s => {
      result[s.key] = s.value;
    });

    return jsonResponse({ settings: result });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 更新设置
export async function onRequestPost(context) {
  const { request, env } = context;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const db = env.DB;

    for (const [key, value] of Object.entries(body)) {
      const existing = await db.prepare('SELECT key FROM settings WHERE key = ?').bind(key).first();
      if (existing) {
        await db.prepare(`
          UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?
        `).bind(String(value), key).run();
      } else {
        await db.prepare(`
          INSERT INTO settings (key, value) VALUES (?, ?)
        `).bind(key, String(value)).run();
      }
    }

    return jsonResponse({ message: '设置更新成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
