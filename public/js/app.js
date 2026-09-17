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

  // 超过限制时压缩图片（缩小边长并转 JPEG），GIF 动画保持原样
  async compressImage(file, maxBytes = 1800 * 1024, maxEdge = 1920) {
    if (!file || !file.type || !file.type.startsWith('image/')) return file;
    if (file.type === 'image/gif') return file;
    if (file.size <= maxBytes) return file;
    if (typeof createImageBitmap !== 'function') return file;

    let bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;
    if (width > maxEdge || height > maxEdge) {
      const scale = maxEdge / Math.max(width, height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const blobToFile = (blob) => {
      const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg' });
    };

    const drawAndEncode = async (w, h, quality) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, w, h);
      return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    };

    try {
      for (const quality of [0.82, 0.7, 0.55, 0.4]) {
        const blob = await drawAndEncode(width, height, quality);
        if (blob && blob.size <= maxBytes) {
          bitmap.close();
          return blobToFile(blob);
        }
      }

      // 质量降到最低仍过大时，继续缩小边长
      for (let i = 0; i < 3; i++) {
        width = Math.max(1, Math.round(width * 0.75));
        height = Math.max(1, Math.round(height * 0.75));
        const blob = await drawAndEncode(width, height, 0.4);
        if (blob && blob.size <= maxBytes) {
          bitmap.close();
          return blobToFile(blob);
        }
        if (i === 2 && blob) {
          bitmap.close();
          return blobToFile(blob);
        }
      }
    } catch (e) {
      try { bitmap.close(); } catch (_) {}
      return file;
    }

    try { bitmap.close(); } catch (_) {}
    return file;
  },

  // 上传图片（multipart，不强制 JSON Content-Type）
  async upload(file) {
    const compressed = await this.compressImage(file);
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const form = new FormData();
    form.append('file', compressed);
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
  formatDateIcon(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `<span class="date-icon" aria-hidden="true"><span class="date-icon-month">${months[date.getMonth()]}</span><span class="date-icon-day">${date.getDate()}</span></span>`;
  },

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

  extractImages(content = '') {
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
  },

  collectPostImages(post = {}) {
    const urls = [];
    const push = (url) => {
      const value = String(url || '').trim();
      if (value && !urls.includes(value)) urls.push(value);
    };
    (post.images || []).forEach(push);
    push(post.cover_image);
    this.extractImages(post.content || '').forEach(push);
    this.extractImages(post.summary || '').forEach(push);
    return urls;
  },

  renderWeiboThumbs(urls = []) {
    const list = (urls || []).filter(Boolean);
    if (!list.length) return '';
    const shown = list.slice(0, 9);
    const extra = list.length > 9 ? list.length - 9 : 0;
    const items = shown.map((url, index) => {
      const more = extra && index === 8 ? `<span class="weibo-more">+${extra}</span>` : '';
      return `<a href="${this.escapeHtml(url)}" class="weibo-thumb"><img src="${this.escapeHtml(url)}" alt="" loading="lazy">${more}</a>`;
    }).join('');
    return `<div class="weibo-thumbs count-${shown.length}">${items}</div>`;
  },

  markdownToPlainText(content = '') {
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
  },

  openLightbox(urls, startIndex = 0) {
    const list = (urls || []).filter(Boolean);
    if (!list.length) return;
    let index = Math.max(0, Math.min(startIndex, list.length - 1));
    const overlay = document.createElement('div');
    overlay.className = 'img-lightbox';
    overlay.innerHTML = `
      <button type="button" class="img-lightbox-close" aria-label="关闭">×</button>
      ${list.length > 1 ? '<button type="button" class="img-lightbox-prev" aria-label="上一张">‹</button><button type="button" class="img-lightbox-next" aria-label="下一张">›</button>' : ''}
      <img alt="">
      <div class="img-lightbox-count"></div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    const img = overlay.querySelector('img');
    const count = overlay.querySelector('.img-lightbox-count');
    const render = () => {
      img.src = list[index];
      count.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
    };
    const close = () => {
      overlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') { index = (index - 1 + list.length) % list.length; render(); }
      if (e.key === 'ArrowRight') { index = (index + 1) % list.length; render(); }
    };
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('img-lightbox-close')) close();
      if (e.target.classList.contains('img-lightbox-prev')) { index = (index - 1 + list.length) % list.length; render(); }
      if (e.target.classList.contains('img-lightbox-next')) { index = (index + 1) % list.length; render(); }
    });
    document.addEventListener('keydown', onKey);
    render();
  },

  bindImageLightbox(root = document) {
    if (root.__lightboxBound) return;
    root.__lightboxBound = true;
    root.addEventListener('click', (e) => {
      const thumb = e.target.closest('.weibo-thumb, .post-content img');
      if (!thumb) return;
      e.preventDefault();
      const grid = thumb.closest('.weibo-thumbs');
      if (grid) {
        const urls = Array.from(grid.querySelectorAll('img')).map(img => img.getAttribute('src')).filter(Boolean);
        const current = thumb.tagName === 'IMG' ? thumb.getAttribute('src') : thumb.querySelector('img')?.getAttribute('src');
        this.openLightbox(urls, Math.max(0, urls.indexOf(current)));
        return;
      }
      const src = thumb.getAttribute('src');
      if (src) this.openLightbox([src], 0);
    });
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

    // 连续图片先转成微博九宫格，再处理普通链接
    html = html.replace(/((?:!\[[^\]]*\]\([^)]+\)\s*)+)/g, (block) => {
      const urls = this.extractImages(block);
      if (!urls.length) return block;
      return `\n${this.renderWeiboThumbs(urls)}\n`;
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
