# 个人博客系统

一个基于 Cloudflare Pages + D1 数据库构建的现代化个人博客系统。

## 功能特性

- 📝 **博客管理** - 发布、编辑、删除文章，支持草稿和发布状态
- 💬 **匿名评论** - 访客可匿名评论，管理员可审核/删除，可单篇关闭评论
- 👁️ **阅读统计** - 每篇文章显示阅读次数
- 🔗 **友情链接** - 左侧文章列表，右侧友情链接栏，可自定义管理
- 🔍 **搜索功能** - 支持搜索文章标题、内容和摘要
- 📱 **响应式设计** - 完美适配电脑和手机
- 🔐 **管理员系统** - 登录/退出/修改密码
- 📥 **一键导出** - 导出所有博客为Markdown格式
- 🌍 **SEO优化** - sitemap.xml、robots.txt、meta标签
- 📬 **联系方式页面** - 可自定义联系方式
- 💰 **广告位支持** - 可自定义广告/推广代码
- 📢 **推广页面** - 独立的推广合作页面

## 技术栈

- **前端**: 原生 HTML + CSS + JavaScript
- **后端**: Cloudflare Pages Functions
- **数据库**: Cloudflare D1 (SQLite)
- **缓存/会话**: Cloudflare KV
- **部署**: Cloudflare Pages

## 初始管理员账号

- 用户名: `admin`
- 密码: `admin123`

> ⚠️ 登录后请立即修改密码！

## 项目结构

```
blog/
├── public/                 # 静态文件目录
│   ├── index.html         # 首页
│   ├── post.html          # 文章详情页
│   ├── search.html        # 搜索页面
│   ├── contact.html       # 联系页面
│   ├── promo.html         # 推广页面
│   ├── robots.txt         # SEO robots
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── js/
│   │   ├── app.js         # 前端通用脚本
│   │   └── admin.js       # 管理后台脚本
│   └── admin/             # 管理后台页面
│       ├── login.html
│       ├── index.html
│       ├── posts.html
│       ├── post-edit.html
│       ├── comments.html
│       ├── links.html
│       ├── settings.html
│       └── profile.html
├── functions/             # Cloudflare Functions (API)
│   ├── _utils.js          # 工具函数
│   ├── api/
│   │   ├── posts.js       # 文章列表/创建
│   │   ├── post/[slug].js # 单篇文章操作
│   │   ├── post/[slug]/comments.js # 评论操作
│   │   ├── links.js       # 友情链接列表/创建
│   │   ├── link/[id].js   # 友情链接操作
│   │   ├── settings.js    # 网站设置
│   │   ├── search.js      # 搜索
│   │   └── admin/         # 管理员相关
│   └── sitemap.xml.js     # 站点地图
├── migrations/            # 数据库迁移
│   └── 0001_init.sql
├── wrangler.toml          # Cloudflare配置
└── package.json
```

## 本地开发

```bash
# 安装依赖
npm install

# 本地开发
npm run dev
```

## 部署到 Cloudflare

### 1. 登录 Cloudflare

```bash
npx wrangler login
```

### 2. 创建 D1 数据库

```bash
npx wrangler d1 create blog-db
```

将输出的 database_id 填入 `wrangler.toml`

### 3. 创建 KV 命名空间

```bash
npx wrangler kv:namespace create BLOG_KV
```

将输出的 id 填入 `wrangler.toml`

### 4. 执行数据库迁移

```bash
npx wrangler d1 execute blog-db --file=migrations/0001_init.sql
```

### 5. 部署

```bash
npx wrangler pages deploy public --project-name=my-blog
```

### 6. 绑定 D1 和 KV 到 Pages 项目

在 Cloudflare 控制台 Pages 项目设置中：
- Functions → D1 数据库绑定 → 添加绑定：名称 `DB`，选择 `blog-db`
- Functions → KV 命名空间绑定 → 添加绑定：名称 `BLOG_KV`，选择创建的命名空间

## 自定义域名

在 Cloudflare Pages 项目设置中添加自定义域名即可。

## 管理后台

访问 `/admin/login.html` 进入管理后台。

## License

MIT
