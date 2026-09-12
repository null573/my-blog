import { jsonResponse, verifyAuth } from '../../_utils';

// 管理员退出
export async function onRequestPost(context) {
  const { request, env } = context;

  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    await env.BLOG_KV.delete(`session:${token}`);
  }

  return jsonResponse({ message: '退出成功' });
}

// 检查登录状态
export async function onRequestGet(context) {
  const { request, env } = context;
  const admin = await verifyAuth(request, env);
  
  if (!admin) {
    return jsonResponse({ isLoggedIn: false });
  }

  return jsonResponse({
    isLoggedIn: true,
    username: admin.username
  });
}
