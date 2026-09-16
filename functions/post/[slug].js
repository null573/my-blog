import {
  getPostBySlug,
  getPostsList,
  getLinks,
  getSettings,
  parseMarkdown,
  escapeHtml,
  formatDate,
  markdownToPlainText,
  injectHead,
  injectSiteSettings,
  injectSsrFlag,
  getAssetHtml
} from '../_utils';

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, s-maxage=60'
};

function renderLinksHtml(links) {
  if (!links.length) {
    return '<li style="color:var(--text-light);font-size:14px;">暂无链接</li>';
  }
  return links.map(link => `
          <li>
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" title="${escapeHtml(link.description || '')}">
              <span class="link-icon">${escapeHtml(String(link.name || '?').charAt(0).toUpperCase())}</span>
              <span>${escapeHtml(link.name)}</span>
            </a>
          </li>`).join('');
}

function renderLatestPostsHtml(posts, currentSlug) {
  const list = posts.filter(p => p.slug !== currentSlug).slice(0, 6);
  if (!list.length) {
    return '<li style="color:var(--text-light);font-size:14px;">暂无文章</li>';
  }
  return list.map(post => `
          <li>
            <a href="/post/${encodeURIComponent(post.slug)}">
              <span class="link-icon">🔥</span>
              <span style="font-size:13px;">${escapeHtml(post.title)}</span>
            </a>
          </li>`).join('');
}

// 处理 /post/:slug —— 服务端渲染文章正文，便于搜索引擎抓取
export async function onRequestGet(context) {
  const { request, env, params } = context;

  try {
    const html = await getAssetHtml(env, '/post.html', request.url);
    const origin = new URL(request.url).origin;
    const slug = params.slug || '';
    const canonical = `${origin}/post/${encodeURIComponent(slug)}`;

    const settings = await getSettings(env);
    const siteTitle = settings.site_title || '我的博客';
    const post = await getPostBySlug(env, slug);

    // 文章不存在或为草稿：交给客户端处理，同时禁止收录
    if (!post || post.status !== 'published') {
      let page = injectHead(html, {
        title: post ? `${post.title} - ${siteTitle}` : `文章不存在 - ${siteTitle}`,
        description: settings.site_description || '',
        keywords: settings.seo_keywords || '',
        canonical
      });
      page = page.replace('</head>', '  <meta name="robots" content="noindex, follow">\n</head>');
      page = injectSsrFlag(page, { page: 'post', slug: '', fallback: true });
      return new Response(page, { status: post ? 200 : 404, headers: HTML_HEADERS });
    }

    const description = post.summary || markdownToPlainText(post.content).slice(0, 150);

    // 侧边栏内链
    const [links, latestResult] = await Promise.all([
      getLinks(env),
      getPostsList(env, 'published', 1, 8)
    ]);

    const postHtml = `
          <article class="card post-detail">
            <h1>${escapeHtml(post.title)}</h1>
            <div class="post-meta">
              <span>📅 ${escapeHtml(formatDate(post.created_at))}</span>
              <span>👁️ ${Number(post.views) || 0} 阅读</span>
              <span>💬 <span id="comment-count">0</span> 评论</span>
            </div>
            <div class="post-content">
              ${parseMarkdown(post.content)}
            </div>
          </article>`;

    let page = html;

    // 注入正文（仅替换初始 loading 占位，保留容器闭合标签）
    page = page.replace(
      /(<div id="post-container">)\s*<div class="loading"><div class="spinner"><\/div><\/div>/,
      `$1${postHtml}`
    );

    // 注入侧边栏友情链接与最新文章
    page = page.replace(
      /<ul class="links-list" id="links-list">[\s\S]*?<\/ul>/,
      `<ul class="links-list" id="links-list">${renderLinksHtml(links)}</ul>`
    );
    page = page.replace(
      /<ul class="links-list" id="latest-posts">[\s\S]*?<\/ul>/,
      `<ul class="links-list" id="latest-posts">${renderLatestPostsHtml(latestResult.posts, slug)}</ul>`
    );

    page = injectSiteSettings(page, settings);

    page = injectHead(page, {
      title: `${post.title} - ${siteTitle}`,
      description,
      keywords: settings.seo_keywords || '',
      canonical,
      ogType: 'article',
      ogImage: post.cover_image || '',
      publishedTime: post.created_at
    });

    page = injectSsrFlag(page, { page: 'post', slug });

    return new Response(page, { headers: HTML_HEADERS });
  } catch (e) {
    return env.ASSETS.fetch(request);
  }
}
