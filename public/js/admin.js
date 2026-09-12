// 管理后台通用脚本
function checkAdminAuth() {
  if (!api.isLoggedIn()) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

function renderAdminSidebar(activePage) {
  return `
    <aside class="admin-sidebar">
      <div style="padding:20px 24px;border-bottom:1px solid #334155;">
        <a href="/" style="color:white;font-weight:700;font-size:1.1rem;display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,var(--primary),#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">B</div>
          <span>博客管理</span>
        </a>
      </div>
      <ul class="admin-sidebar-menu">
        <li><a href="/admin/" class="${activePage === 'dashboard' ? 'active' : ''}">📊 仪表盘</a></li>
        <li><a href="/admin/posts.html" class="${activePage === 'posts' ? 'active' : ''}">📝 文章管理</a></li>
        <li><a href="/admin/post-edit.html" class="${activePage === 'new-post' ? 'active' : ''}">✏️ 写文章</a></li>
        <li><a href="/admin/comments.html" class="${activePage === 'comments' ? 'active' : ''}">💬 评论管理</a></li>
        <li><a href="/admin/links.html" class="${activePage === 'links' ? 'active' : ''}">🔗 友情链接</a></li>
        <li><a href="/admin/settings.html" class="${activePage === 'settings' ? 'active' : ''}">⚙️ 网站设置</a></li>
        <li><a href="/admin/profile.html" class="${activePage === 'profile' ? 'active' : ''}">👤 修改密码</a></li>
      </ul>
      <div style="position:absolute;bottom:20px;left:0;right:0;padding:0 24px;">
        <a href="/" target="_blank" style="color:#94a3b8;font-size:14px;display:block;padding:8px 0;">🌐 查看网站</a>
        <a href="#" onclick="handleLogout();return false;" style="color:#94a3b8;font-size:14px;display:block;padding:8px 0;">🚪 退出登录</a>
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
