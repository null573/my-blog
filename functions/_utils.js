// 工具函数
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// 简单的密码哈希（生产环境建议用更安全的方式）
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'blog_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证管理员Token
export async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  // 简单的token验证 - 实际生产中应该用JWT
  const adminSession = await env.BLOG_KV.get(`session:${token}`);
  if (!adminSession) {
    return null;
  }
  return JSON.parse(adminSession);
}

// 生成随机Token
export function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// 获取客户端IP
export function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For') || 
         '127.0.0.1';
}

// 生成摘要
export function generateSummary(content, length = 200) {
  const text = content.replace(/<[^>]*>/g, '').replace(/[#*`\[\]]/g, '').trim();
  return text.length > length ? text.substring(0, length) + '...' : text;
}

// 生成slug
export function generateSlug(title) {
  let slug = title.toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  if (!slug) {
    slug = 'post-' + Date.now();
  }
  return slug;
}
