// KV存储工具函数

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

// 密码哈希
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'blog_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证管理员
export async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const adminSession = await env.BLOG_KV.get(`session:${token}`);
  if (!adminSession) {
    return null;
  }
  return JSON.parse(adminSession);
}

// 生成Token
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

// 生成唯一ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// KV数据操作辅助函数

// 获取文章列表（带分页）
export async function getPostsList(env, status = 'published', page = 1, limit = 10) {
  const postsData = await env.BLOG_KV.get('posts:list', { type: 'json' });
  let posts = postsData || [];
  
  if (status !== 'all') {
    posts = posts.filter(p => p.status === status);
  }
  
  // 按创建时间倒序
  posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const total = posts.length;
  const start = (page - 1) * limit;
  const paginatedPosts = posts.slice(start, start + limit);
  
  return {
    posts: paginatedPosts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

// 获取单篇文章
export async function getPostBySlug(env, slug) {
  const post = await env.BLOG_KV.get(`post:${slug}`, { type: 'json' });
  return post;
}

// 保存文章（同时更新列表索引）
export async function savePost(env, post) {
  // 保存文章详情
  await env.BLOG_KV.put(`post:${post.slug}`, JSON.stringify(post));
  
  // 更新列表索引
  const postsData = await env.BLOG_KV.get('posts:list', { type: 'json' });
  let posts = postsData || [];
  
  const existingIndex = posts.findIndex(p => p.slug === post.slug);
  const listItem = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    cover_image: post.cover_image,
    status: post.status,
    allow_comments: post.allow_comments,
    views: post.views,
    created_at: post.created_at,
    updated_at: post.updated_at
  };
  
  if (existingIndex >= 0) {
    posts[existingIndex] = listItem;
  } else {
    posts.push(listItem);
  }
  
  await env.BLOG_KV.put('posts:list', JSON.stringify(posts));
  return post;
}

// 删除文章
export async function deletePost(env, slug) {
  // 删除文章详情
  await env.BLOG_KV.delete(`post:${slug}`);
  
  // 从列表中移除
  const postsData = await env.BLOG_KV.get('posts:list', { type: 'json' });
  let posts = postsData || [];
  posts = posts.filter(p => p.slug !== slug);
  await env.BLOG_KV.put('posts:list', JSON.stringify(posts));
  
  // 删除评论
  await env.BLOG_KV.delete(`comments:${slug}`);
}

// 获取评论
export async function getComments(env, postSlug, admin = false) {
  const commentsData = await env.BLOG_KV.get(`comments:${postSlug}`, { type: 'json' });
  let comments = commentsData || [];
  
  if (!admin) {
    comments = comments.filter(c => c.status === 'approved');
  }
  
  comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return comments;
}

// 添加评论
export async function addComment(env, postSlug, comment) {
  const commentsData = await env.BLOG_KV.get(`comments:${postSlug}`, { type: 'json' });
  let comments = commentsData || [];
  comments.push(comment);
  await env.BLOG_KV.put(`comments:${postSlug}`, JSON.stringify(comments));
  return comment;
}

// 删除评论
export async function deleteComment(env, postSlug, commentId) {
  const commentsData = await env.BLOG_KV.get(`comments:${postSlug}`, { type: 'json' });
  let comments = commentsData || [];
  comments = comments.filter(c => c.id !== commentId);
  await env.BLOG_KV.put(`comments:${postSlug}`, JSON.stringify(comments));
}

// 更新评论状态
export async function updateCommentStatus(env, postSlug, commentId, status) {
  const commentsData = await env.BLOG_KV.get(`comments:${postSlug}`, { type: 'json' });
  let comments = commentsData || [];
  const comment = comments.find(c => c.id === commentId);
  if (comment) {
    comment.status = status;
    await env.BLOG_KV.put(`comments:${postSlug}`, JSON.stringify(comments));
  }
  return comment;
}

// 获取友情链接
export async function getLinks(env, admin = false) {
  const linksData = await env.BLOG_KV.get('links:list', { type: 'json' });
  let links = linksData || [];
  
  if (!admin) {
    links = links.filter(l => l.is_visible === 1);
  }
  
  links.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  return links;
}

// 保存友情链接
export async function saveLink(env, link) {
  const linksData = await env.BLOG_KV.get('links:list', { type: 'json' });
  let links = linksData || [];
  
  if (link.id) {
    const index = links.findIndex(l => l.id === link.id);
    if (index >= 0) {
      links[index] = { ...links[index], ...link };
    }
  } else {
    link.id = generateId();
    links.push(link);
  }
  
  await env.BLOG_KV.put('links:list', JSON.stringify(links));
  return link;
}

// 删除友情链接
export async function deleteLink(env, id) {
  const linksData = await env.BLOG_KV.get('links:list', { type: 'json' });
  let links = linksData || [];
  links = links.filter(l => l.id !== id);
  await env.BLOG_KV.put('links:list', JSON.stringify(links));
}

// 获取设置
export async function getSettings(env) {
  const settings = await env.BLOG_KV.get('settings', { type: 'json' });
  return settings || {
    site_title: '我的博客',
    site_description: '分享技术与生活',
    contact_info: '邮箱: admin@example.com',
    ad_code: '',
    seo_keywords: '博客,技术,生活',
    comments_moderation: '0',
    promo_content: ''
  };
}

// 保存设置
export async function saveSettings(env, settings) {
  const existing = await getSettings(env);
  const merged = { ...existing, ...settings };
  await env.BLOG_KV.put('settings', JSON.stringify(merged));
  return merged;
}

// 初始化管理员账号
export async function initAdmin(env) {
  const admin = await env.BLOG_KV.get('admin:user', { type: 'json' });
  if (!admin) {
    const passwordHash = await hashPassword('admin123');
    await env.BLOG_KV.put('admin:user', JSON.stringify({
      id: '1',
      username: 'admin',
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    }));
  }
}

// 获取管理员
export async function getAdmin(env, username) {
  const admin = await env.BLOG_KV.get('admin:user', { type: 'json' });
  if (admin && admin.username === username) {
    return admin;
  }
  return null;
}

// 更新管理员密码
export async function updateAdminPassword(env, adminId, newPasswordHash) {
  const admin = await env.BLOG_KV.get('admin:user', { type: 'json' });
  if (admin && admin.id === adminId) {
    admin.password_hash = newPasswordHash;
    admin.updated_at = new Date().toISOString();
    await env.BLOG_KV.put('admin:user', JSON.stringify(admin));
    return true;
  }
  return false;
}

// 搜索文章
export async function searchPosts(env, query, page = 1, limit = 10) {
  const postsData = await env.BLOG_KV.get('posts:list', { type: 'json' });
  let posts = postsData || [];
  
  posts = posts.filter(p => 
    p.status === 'published' && (
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.summary.toLowerCase().includes(query.toLowerCase())
    )
  );
  
  // 对于内容搜索，需要逐个加载
  if (posts.length < limit * 3) {
    const allPosts = postsData || [];
    for (const p of allPosts) {
      if (p.status !== 'published') continue;
      if (posts.find(x => x.slug === p.slug)) continue;
      
      const fullPost = await env.BLOG_KV.get(`post:${p.slug}`, { type: 'json' });
      if (fullPost && fullPost.content.toLowerCase().includes(query.toLowerCase())) {
        posts.push(p);
      }
    }
  }
  
  posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const total = posts.length;
  const start = (page - 1) * limit;
  const paginatedPosts = posts.slice(start, start + limit);
  
  return {
    posts: paginatedPosts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    query
  };
}
