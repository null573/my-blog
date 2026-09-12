import { jsonResponse, errorResponse, verifyAuth } from '../_utils';

// 导出所有博客为文本/Markdown
export async function onRequestGet(context) {
  const { request, env } = context;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const db = env.DB;
    const posts = await db.prepare(`
      SELECT id, title, slug, content, status, views, created_at, updated_at
      FROM posts
      ORDER BY created_at DESC
    `).all();

    // 生成Markdown格式的导出
    let exportContent = `# 博客导出\n\n导出时间: ${new Date().toLocaleString('zh-CN')}\n文章数量: ${posts.results.length}\n\n---\n\n`;

    posts.results.forEach((post, index) => {
      exportContent += `## ${index + 1}. ${post.title}\n\n`;
      exportContent += `- 别名: ${post.slug}\n`;
      exportContent += `- 状态: ${post.status}\n`;
      exportContent += `- 阅读量: ${post.views}\n`;
      exportContent += `- 创建时间: ${post.created_at}\n`;
      exportContent += `- 更新时间: ${post.updated_at}\n\n`;
      exportContent += `---\n\n${post.content}\n\n`;
      exportContent += `---\n\n`;
    });

    // 也导出JSON格式
    const jsonExport = JSON.stringify(posts.results, null, 2);

    return new Response(exportContent, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="blog-export.md"',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
