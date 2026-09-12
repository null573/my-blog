import { jsonResponse, errorResponse, verifyAuth, getLinks, saveLink, deleteLink } from '../../_utils';

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
    const links = await getLinks(env, true);
    const existing = links.find(l => l.id === id);
    
    if (!existing) {
      return errorResponse('链接不存在', 404);
    }

    const updated = { ...existing, ...body };
    if (body.sort_order !== undefined) updated.sort_order = parseInt(body.sort_order) || 0;
    if (body.is_visible !== undefined) updated.is_visible = body.is_visible ? 1 : 0;

    await saveLink(env, updated);
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
    const links = await getLinks(env, true);
    const existing = links.find(l => l.id === id);
    
    if (!existing) {
      return errorResponse('链接不存在', 404);
    }

    await deleteLink(env, id);
    return jsonResponse({ message: '删除成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
