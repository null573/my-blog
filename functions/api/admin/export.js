import { jsonResponse, errorResponse, verifyAuth, getPostsList, getPostBySlug } from '../../_utils';

// 导出所有博客为Markdown
export async function onRequestGet(context) {
  const { request, env } = context;

  // 支持通过query参数传递token（用于下载链接）
  const token = new URL(request.url).searchParams.get('token');
  let admin = null;
  
  if (token) {
    const adminSession = await env.BLOG_KV.get(`session:${token}`);
    if (adminSession) {
      admin = JSON.parse(adminSession);
    }
  } else {
    admin = await verifyAuth(request, env);
  }

  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    // 获取所有文章
    const result = await getPostsList(env, 'all', 1, 1000);
    const posts = result.posts;

    // 生成Markdown格式的导出
    let exportContent = `# 博客导出\n\n导出时间: ${new Date().toLocaleString('zh-CN')}\n文章数量: ${posts.length}\n\n---\n\n`;

    for (let i = 0; i < posts.length; i++) {
      const postListItem = posts[i];
      const fullPost = await getPostBySlug(env, postListItem.slug);
      const post = fullPost || postListItem;
      
      exportContent += `## ${i + 1}. ${post.title}\n\n`;
      exportContent += `- 别名: ${post.slug}\n`;
      exportContent += `- 状态: ${post.status}\n`;
      exportContent += `- 阅读量: ${post.views || 0}\n`;
      exportContent += `- 创建时间: ${post.created_at}\n`;
      exportContent += `- 更新时间: ${post.updated_at}\n\n`;
      exportContent += `---\n\n${post.content || ''}\n\n`;
      exportContent += `---\n\n`;
    }

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
