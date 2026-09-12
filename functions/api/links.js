import { jsonResponse, errorResponse, verifyAuth, getLinks, saveLink } from '../_utils';

// 获取友情链接列表
export async function onRequestGet(context) {
  const { request, env } = context;
  
  const admin = await verifyAuth(request, env);
  
  try {
    const links = await getLinks(env, !!admin);
    return jsonResponse({ links });
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

    const link = await saveLink(env, {
      name,
      url,
      description,
      sort_order: parseInt(sort_order) || 0,
      is_visible: is_visible ? 1 : 0,
      created_at: new Date().toISOString()
    });

    return jsonResponse({
      id: link.id,
      message: '添加成功'
    }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
