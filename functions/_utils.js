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

// 从 Markdown 正文提取图片地址
export function extractImages(content = '') {
  const urls = [];
  const push = (url) => {
    const value = String(url || '').trim();
    if (value && !urls.includes(value)) urls.push(value);
  };
  const text = String(content);
  let match;
  const md = /!\[[^\]]*\]\(([^)]+)\)/g;
  while ((match = md.exec(text))) push(match[1]);
  const media = /(\/api\/media\/[a-z0-9]+)/gi;
  while ((match = media.exec(text))) push(match[1]);
  return urls;
}

export function collectPostImages(post = {}) {
  const urls = [];
  const push = (url) => {
    const value = String(url || '').trim();
    if (value && !urls.includes(value)) urls.push(value);
  };
  (post.images || []).forEach(push);
  push(post.cover_image);
  extractImages(post.content || '').forEach(push);
  extractImages(post.summary || '').forEach(push);
  return urls;
}

export function renderWeiboThumbs(urls = []) {
  const list = (urls || []).filter(Boolean);
  if (!list.length) return '';
  const shown = list.slice(0, 9);
  const extra = list.length > 9 ? list.length - 9 : 0;
  const items = shown.map((url, index) => {
    const more = extra && index === 8 ? `<span class="weibo-more">+${extra}</span>` : '';
    return `<a href="${escapeHtml(url)}" class="weibo-thumb"><img src="${escapeHtml(url)}" alt="" loading="lazy">${more}</a>`;
  }).join('');
  return `<div class="weibo-thumbs count-${shown.length}">${items}</div>`;
}

// 生成摘要
export function generateSummary(content, length = 200) {
  const text = markdownToPlainText(content);
  return text.length > length ? text.substring(0, length) + '...' : text;
}

// 生成slug（纯ASCII安全）
export function generateSlug(title) {
  let slug = title.toLowerCase()
    .replace(/[^\w\s-]/g, '')  // 移除非ASCII字符（含中文）
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
  // 如果为空（纯中文标题），用短时间戳
  if (!slug) {
    slug = 'p-' + Date.now().toString(36);
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

// 获取单篇文章（自动解码URL编码的slug）
export async function getPostBySlug(env, slug) {
  // 尝试解码URL编码的slug
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (e) {
    // 如果解码失败，使用原始值
  }
  const post = await env.BLOG_KV.get(`post:${decodedSlug}`, { type: 'json' });
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
    images: collectPostImages(post),
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

// ===== 服务端渲染（SEO）工具 =====

// HTML转义
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 格式化日期（服务端）
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return date.toISOString().split('T')[0];
  }
}

// 简单的Markdown解析（与前端 utils.parseMarkdown 保持一致）
export function parseMarkdown(text) {
  if (!text) return '';

  let html = text;

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 标题
  html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 连续图片先转成微博九宫格，再处理普通链接
  html = html.replace(/((?:!\[[^\]]*\]\([^)]+\)\s*)+)/g, (block) => {
    const urls = extractImages(block);
    if (!urls.length) return block;
    return `\n${renderWeiboThumbs(urls)}\n`;
  });

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 引用
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

  // 无序列表
  html = html.replace(/^[-*] (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\n<ul>/g, '');

  // 有序列表
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>');

  // 水平线
  html = html.replace(/^---$/gm, '<hr>');

  // 段落
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><(h\d|ul|ol|blockquote|pre|hr|div)/g, '<$1');
  html = html.replace(/<\/(h\d|ul|ol|blockquote|pre|div)><\/p>/g, '</$1>');
  html = html.replace(/<p><\/p>/g, '');

  // 换行
  html = html.replace(/\n/g, '<br>');

  return html;
}

// 去掉Markdown标记，生成纯文本摘要
export function markdownToPlainText(content = '') {
  return String(content)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!?\s*图片\s*\([^)]*\)/g, ' ')
    .replace(/!\[[^\]]*\]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\/api\/media\/[a-z0-9]+/gi, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 注入 head 标签（title / description / keywords / canonical / og）
export function injectHead(html, options = {}) {
  const { title, description, keywords, canonical, ogType, ogImage, publishedTime } = options;
  let out = html;

  if (title) {
    if (/<title>[\s\S]*?<\/title>/.test(out)) {
      out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
    } else {
      out = out.replace('</head>', `  <title>${escapeHtml(title)}</title>\n</head>`);
    }
  }

  if (description) {
    const tag = `<meta name="description" content="${escapeHtml(description)}">`;
    if (/<meta name="description"[^>]*>/.test(out)) {
      out = out.replace(/<meta name="description"[^>]*>/, tag);
    } else {
      out = out.replace('</head>', `  ${tag}\n</head>`);
    }
  }

  if (keywords) {
    const tag = `<meta name="keywords" content="${escapeHtml(keywords)}">`;
    if (/<meta name="keywords"[^>]*>/.test(out)) {
      out = out.replace(/<meta name="keywords"[^>]*>/, tag);
    } else {
      out = out.replace('</head>', `  ${tag}\n</head>`);
    }
  }

  const extra = [];
  if (canonical) {
    extra.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`);
    extra.push(`<meta property="og:url" content="${escapeHtml(canonical)}">`);
  }
  if (title) {
    extra.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
    extra.push(`<meta name="twitter:title" content="${escapeHtml(title)}">`);
  }
  if (description) {
    extra.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
    extra.push(`<meta name="twitter:description" content="${escapeHtml(description)}">`);
  }
  if (ogType) extra.push(`<meta property="og:type" content="${escapeHtml(ogType)}">`);
  extra.push('<meta name="twitter:card" content="summary">');
  if (ogImage) {
    extra.push(`<meta property="og:image" content="${escapeHtml(ogImage)}">`);
  }
  if (publishedTime) {
    extra.push(`<meta property="article:published_time" content="${escapeHtml(publishedTime)}">`);
  }

  if (extra.length) {
    out = out.replace('</head>', `  ${extra.join('\n  ')}\n</head>`);
  }

  return out;
}

// 注入站点设置（标题、页脚描述、联系方式）
export function injectSiteSettings(html, settings = {}) {
  let out = html;

  if (settings.site_title) {
    out = out.replace(
      /(<span id="site-title">)[\s\S]*?(<\/span>)/,
      `$1${escapeHtml(settings.site_title)}$2`
    );
  }
  if (settings.site_description) {
    out = out.replace(
      /(<p id="footer-desc">)[\s\S]*?(<\/p>)/,
      `$1${escapeHtml(settings.site_description)}$2`
    );
  }
  if (settings.contact_info) {
    const contact = escapeHtml(settings.contact_info).replace(/\n/g, '<br>');
    out = out.replace(
      /(<p id="footer-contact">)[\s\S]*?(<\/p>)/,
      `$1${contact}$2`
    );
  }

  return out;
}

// 注入 SSR 标记，前端据此跳过重复渲染
export function injectSsrFlag(html, payload) {
  const script = `<script>window.__SSR_PAGE__=${JSON.stringify(payload)};</script>`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `  ${script}\n</body>`);
  }
  return html + script;
}

// 获取静态资源HTML模板
export async function getAssetHtml(env, path, requestUrl) {
  const assetUrl = new URL(path, requestUrl);
  const res = await env.ASSETS.fetch(new Request(assetUrl.toString()));
  if (!res.ok) {
    throw new Error(`加载模板失败: ${path} (${res.status})`);
  }
  return await res.text();
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
