import { jsonResponse, errorResponse, verifyAuth } from '../_utils';

// 获取友情链接列表
export async function onRequestGet(context) {
  const { request, env } = context;
  
  const admin = await verifyAuth(request, env);
  
  try {
    const db = env.DB;
    let query = 'SELECT * FROM links';
    let params = [];
    
    if (!admin) {
      query += ' WHERE is_visible = 1';
    }
    query += ' ORDER BY sort_order ASC, id ASC';
    
    const links = await db.prepare(query).bind(...params).all();
    return jsonResponse({ links: links.results });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 添加友情链接
export async function onRequestPost(context) {
  const { request, env } = context;
  
  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { name, url, description = '', sort_order = 0, is_visible = 1 } = body;

    if (!name || !url) {
      return errorResponse('名称和链接不能为空', 400);
    }

    const db = env.DB;
    const result = await db.prepare(`
      INSERT INTO links (name, url, description, sort_order, is_visible)
      VALUES (?, ?, ?, ?, ?)
    `).bind(name, url, description, sort_order, is_visible ? 1 : 0).run();

    return jsonResponse({
      id: result.meta.last_row_id,
      message: '添加成功'
    }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
