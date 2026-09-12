import { jsonResponse, errorResponse, verifyAuth, getSettings, saveSettings } from '../_utils';

// 获取设置
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const settings = await getSettings(env);
    return jsonResponse({ settings });
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
    const settings = await saveSettings(env, body);
    return jsonResponse({ message: '设置更新成功', settings });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
