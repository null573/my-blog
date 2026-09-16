# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Project Knowledge Summary]
- Date: 2026-09-16
- Context: Discovered by Agent while implementing SEO server-side rendering
- Category: Operations & Deployment
- Instructions:
  - 站点为 Cloudflare Pages 项目，项目名 `eblog1`，生产域名 `eblog1.pages.dev`，构建输出目录为 `public`。
  - 部署前先在仓库根提交并 push 到 `main`，再执行：`CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<account_id> npx wrangler pages deploy public --project-name=eblog1 --branch=main --commit-hash=$(git rev-parse HEAD) --commit-message="<msg>"`。
  - wrangler 已全局安装（v4 系列），可直接 `npx wrangler` 调用。
  - 本地调试 Pages Functions：`npx wrangler pages dev public --kv BLOG_KV --port 8799`（KV 默认为空，仅用于验证路由与模板渲染）。
  - 数据存储：文章、链接、设置存于 KV 绑定 `BLOG_KV`；D1 绑定名为 `DB`。
  - 本执行环境无法访问 `eblog1.pages.dev` 及部署预览域名（curl/webfetch 均超时），线上效果需用户自行在浏览器验证。

[Project Knowledge Summary]
- Date: 2026-09-16
- Context: Discovered by Agent while implementing SEO server-side rendering
- Category: Troubleshooting & Debugging
- Instructions:
  - Pages Functions 之间使用无扩展名的相对导入（如 `from '../_utils'`），Node 直接运行需自定义 resolve hook 才能解析；用 `import()` 动态导入配合 loader 即可在本地做单元测试。
  - 渲染模板通过 `env.ASSETS.fetch(new Request(new URL('/index.html', request.url)))` 读取静态 HTML，ASSETS 绑定不会触发 Functions，可直接拿到静态模板。
  - 页面路由由 `public/_routes.json` 的 include 列表控制，新增服务端渲染路由时必须同步更新该文件。
  - 前端页面根据 `window.__SSR_PAGE__` 标记跳过重复的客户端渲染请求。
