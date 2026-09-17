// API 工具函数
const API_BASE = '/api';

const api = {
  // 获取token
  getToken() {
    return localStorage.getItem('admin_token');
  },

  // 设置token
  setToken(token) {
    localStorage.setItem('admin_token', token);
  },

  // 清除token
  clearToken() {
    localStorage.removeItem('admin_token');
  },

  // 检查是否登录
  isLoggedIn() {
    return !!this.getToken();
  },

  // 请求封装
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  },

  // GET 请求
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  // POST 请求
  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  // PUT 请求
  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  // DELETE 请求
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // 上传图片（multipart，不强制 JSON Content-Type）
  async upload(file) {
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: form
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '上传失败');
    }
    return data;
  },

  // 文章相关
  posts: {
    list(page = 1, limit = 10, status = 'published') {
      return api.get(`/posts?page=${page}&limit=${limit}&status=${status}`);
    },
    get(slug) {
      return api.get(`/post/${encodeURIComponent(slug)}`);
    },
    create(data) {
      return api.post('/posts', data);
    },
    update(slug, data) {
      return api.put(`/post/${encodeURIComponent(slug)}`, data);
    },
    delete(slug) {
      return api.delete(`/post/${encodeURIComponent(slug)}`);
    }
  },

  // 评论相关
  comments: {
    list(slug, page = 1, limit = 50) {
      return api.get(`/post/${encodeURIComponent(slug)}/comments?page=${page}&limit=${limit}`);
    },
    create(slug, data) {
      return api.post(`/post/${encodeURIComponent(slug)}/comments`, data);
    },
    delete(id) {
      return api.delete(`/admin/comment/${id}`);
    },
    updateStatus(id, status) {
      return api.put(`/admin/comment/${id}`, { status });
    }
  },

  // 友情链接
  links: {
    list() {
      return api.get('/links');
    },
    create(data) {
      return api.post('/links', data);
    },
    update(id, data) {
      return api.put(`/link/${id}`, data);
    },
    delete(id) {
      return api.delete(`/link/${id}`);
    }
  },

  // 设置
  settings: {
    get() {
      return api.get('/settings');
    },
    update(data) {
      return api.post('/settings', data);
    }
  },

  // 搜索
  search(query, page = 1, limit = 10) {
    return api.get(`/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  },

  // 管理员
  admin: {
    login(username, password) {
      return api.post('/admin/login', { username, password });
    },
    logout() {
      return api.post('/admin/logout');
    },
    checkAuth() {
      return api.get('/admin/logout');
    },
    changePassword(oldPassword, newPassword) {
      return api.post('/admin/password', { oldPassword, newPassword });
    },
    exportBlogs() {
      const token = api.getToken();
      window.location.href = `${API_BASE}/admin/export?token=${token}`;
    }
  }
};

// 工具函数
const utils = {
  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // 格式化日期时间
  formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // 相对时间
  relativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) return this.formatDate(dateStr);
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  },

  // 显示消息
  showMessage(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 2000; min-width: 250px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.style.transition = 'opacity 0.3s, transform 0.3s';
      alertDiv.style.opacity = '0';
      alertDiv.style.transform = 'translateY(-10px)';
      setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
  },

  // 确认对话框
  confirm(message) {
    return new Promise((resolve) => {
      const result = window.confirm(message);
      resolve(result);
    });
  },

  // 获取URL参数
  getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  // 转义HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // 简单的Markdown解析
  parseMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // 代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${this.escapeHtml(code)}</code></pre>`;
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
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    
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
    html = html.replace(/<p><(h\d|ul|ol|blockquote|pre|hr)/g, '<$1');
    html = html.replace(/<\/(h\d|ul|ol|blockquote|pre)><\/p>/g, '</$1>');
    html = html.replace(/<p><\/p>/g, '');
    
    // 换行
    html = html.replace(/\n/g, '<br>');
    
    return html;
  },

  // 防抖
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // 加载状态
  showLoading(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  },

  // 空状态
  showEmpty(container, message = '暂无数据', icon = '📭') {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <h3>${message}</h3>
      </div>
    `;
  }
};

// 导出到全局
window.api = api;
window.utils = utils;
