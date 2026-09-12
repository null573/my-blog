import { jsonResponse, errorResponse, verifyAuth, generateSummary, generateSlug, generateId, getPostsList, getPostBySlug, savePost, deletePost } from '../_utils';

// 获取文章列表
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const status = url.searchParams.get('status') || 'published';

  try {
    const admin = await verifyAuth(request, env);
    
    if (!admin && status !== 'published') {
      return errorResponse('无权限查看', 403);
    }

    const result = await getPostsList(env, status, page, limit);
    return jsonResponse(result);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 创建文章
export async function onRequestPost(context) {
  const { request, env } = context;
  
  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { title, content, status = 'published', allow_comments = 1, cover_image = '', slug: customSlug } = body;

    if (!title || !content) {
      return errorResponse('标题和内容不能为空', 400);
    }

    const slug = customSlug || generateSlug(title);
    
    // 检查slug是否已存在
    const existing = await getPostBySlug(env, slug);
    if (existing) {
      return errorResponse('URL别名已存在，请修改标题或自定义别名', 400);
    }

    const summary = generateSummary(content);
    const now = new Date().toISOString();

    const post = {
      id: generateId(),
      title,
      slug,
      content,
      summary,
      cover_image: cover_image || '',
      status,
      allow_comments: allow_comments ? 1 : 0,
      views: 0,
      created_at: now,
      updated_at: now
    };

    await savePost(env, post);

    return jsonResponse({
      id: post.id,
      slug,
      message: '发布成功'
    }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
