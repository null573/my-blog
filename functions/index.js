import {
  getPostsList,
  getLinks,
  getSettings,
  escapeHtml,
  formatDate,
  injectHead,
  injectSiteSettings,
  injectSsrFlag,
  getAssetHtml,
  collectPostImages,
  renderWeiboThumbs,
  markdownToPlainText
} from './_utils';

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, s-maxage=60'
};

function postUrl(slug) {
  return `/post/${encodeURIComponent(slug)}`;
}

function renderPostsHtml(posts) {
  return posts.map(post => {
    const summary = markdownToPlainText(post.summary || '');
    const thumbs = renderWeiboThumbs(collectPostImages(post));
    return `
          <article class="card post-card">
            <h2><a href="${postUrl(post.slug)}">${escapeHtml(post.title)}</a></h2>
            <div class="post-meta">
              <span>📅 ${escapeHtml(formatDate(post.created_at))}</span>
              <span>👁️ ${Number(post.views) || 0} 阅读</span>
            </div>
            ${summary ? `<p class="post-summary">${escapeHtml(summary)}</p>` : ''}
            ${thumbs}
            <a href="${postUrl(post.slug)}" class="btn btn-primary btn-sm">阅读全文 →</a>
          </article>`;
  }).join('');
}

function renderPaginationHtml(currentPage, totalPages) {
  if (totalPages <= 1) return '';

  let html = '<div class="pagination">';

  html += currentPage > 1
    ? `<a href="/?page=${currentPage - 1}">← 上一页</a>`
    : '<span class="disabled">← 上一页</span>';

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += i === currentPage ? `<span class="current">${i}</span>` : `<a href="/?page=${i}">${i}</a>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += '<span>...</span>';
    }
  }

  html += currentPage < totalPages
    ? `<a href="/?page=${currentPage + 1}">下一页 →</a>`
    : '<span class="disabled">下一页 →</span>';

  return html + '</div>';
}

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

function renderPopularPostsHtml(posts) {
  const list = [...posts].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0)).slice(0, 5);
  if (!list.length) {
    return '<li style="color:var(--text-light);font-size:14px;">暂无文章</li>';
  }
  return list.map(post => `
          <li>
            <a href="${postUrl(post.slug)}">
              <span class="link-icon">🔥</span>
              <span style="font-size:13px;">${escapeHtml(post.title)}</span>
            </a>
          </li>`).join('');
}

// 首页服务端渲染文章列表与侧边栏链接，便于搜索引擎抓取内链
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const html = await getAssetHtml(env, '/index.html', request.url);
    const url = new URL(request.url);
    const origin = url.origin;
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10) || 1, 1);

    const settings = await getSettings(env);
    const siteTitle = settings.site_title || '我的博客';
    const siteDescription = settings.site_description || '分享技术与生活';

    const [listResult, recentResult, links] = await Promise.all([
      getPostsList(env, 'published', page, 10),
      getPostsList(env, 'published', 1, 10),
      getLinks(env)
    ]);

    let output = html;

    output = output.replace(
      /(<div id="posts-container">)\s*<div class="loading"><div class="spinner"><\/div><\/div>/,
      `$1${renderPostsHtml(listResult.posts)}`
    );
    output = output.replace(
      /<div id="pagination"><\/div>/,
      `<div id="pagination">${renderPaginationHtml(page, listResult.totalPages)}</div>`
    );
    output = output.replace(
      /<ul class="links-list" id="links-list">[\s\S]*?<\/ul>/,
      `<ul class="links-list" id="links-list">${renderLinksHtml(links)}</ul>`
    );
    output = output.replace(
      /<ul class="links-list" id="popular-posts">[\s\S]*?<\/ul>/,
      `<ul class="links-list" id="popular-posts">${renderPopularPostsHtml(recentResult.posts)}</ul>`
    );

    output = injectSiteSettings(output, settings);

    output = injectHead(output, {
      title: page > 1 ? `${siteTitle} - 第 ${page} 页` : siteTitle,
      description: siteDescription,
      keywords: settings.seo_keywords || '',
      canonical: page > 1 ? `${origin}/?page=${page}` : `${origin}/`,
      ogType: 'website'
    });

    output = injectSsrFlag(output, { page: 'home' });

    return new Response(output, { headers: HTML_HEADERS });
  } catch (e) {
    return env.ASSETS.fetch(request);
  }
}
