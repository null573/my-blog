// 管理后台通用脚本
function getSafeRedirectPath(value) {
  if (typeof value !== 'string') return '/admin/';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/admin/';
  }
  return value;
}

function checkAdminAuth() {
  if (!api.isLoggedIn()) {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login.html?redirect=${returnUrl}`;
    return false;
  }
  return true;
}

function renderAdminSidebar(activePage) {
  return `
    <aside class="admin-sidebar">
      <div class="admin-sidebar-brand">
        <a href="/" class="admin-sidebar-logo">
          <div class="admin-sidebar-logo-icon">G</div>
          <span>博客管理</span>
        </a>
      </div>
      <ul class="admin-sidebar-menu">
        <li><a href="/admin/" class="${activePage === 'dashboard' ? 'active' : ''}">📊 仪表盘</a></li>
        <li><a href="/admin/posts.html" class="${activePage === 'posts' ? 'active' : ''}">📝 文章</a></li>
        <li><a href="/admin/post-edit.html" class="${activePage === 'new-post' ? 'active' : ''}">✏️ 写文章</a></li>
        <li><a href="/admin/comments.html" class="${activePage === 'comments' ? 'active' : ''}">💬 评论</a></li>
        <li><a href="/admin/links.html" class="${activePage === 'links' ? 'active' : ''}">🔗 链接</a></li>
        <li><a href="/admin/settings.html" class="${activePage === 'settings' ? 'active' : ''}">⚙️ 设置</a></li>
        <li><a href="/admin/profile.html" class="${activePage === 'profile' ? 'active' : ''}">👤 密码</a></li>
        <li class="admin-sidebar-mobile-only"><a href="/" target="_blank">🌐 网站</a></li>
        <li class="admin-sidebar-mobile-only"><a href="#" onclick="handleLogout();return false;">🚪 退出</a></li>
      </ul>
      <div class="admin-sidebar-footer">
        <a href="/" target="_blank" class="admin-sidebar-footer-link">🌐 查看网站</a>
        <a href="#" onclick="handleLogout();return false;" class="admin-sidebar-footer-link">🚪 退出登录</a>
      </div>
    </aside>
  `;
}

async function handleLogout() {
  try {
    await api.admin.logout();
  } catch (e) {
    // 忽略错误
  }
  api.clearToken();
  window.location.href = '/admin/login.html';
}

window.checkAdminAuth = checkAdminAuth;
window.renderAdminSidebar = renderAdminSidebar;
window.handleLogout = handleLogout;
window.getSafeRedirectPath = getSafeRedirectPath;
