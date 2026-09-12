import { jsonResponse, errorResponse, verifyAuth, getClientIP, generateId, getPostBySlug, getComments, addComment, getSettings } from '../../../_utils';

// 获取评论列表
export async function onRequestGet(context) {
  const { request, env, params } = context;
  let { slug } = params;
  
  // 解码slug
  try { slug = decodeURIComponent(slug); } catch(e) {}

  try {
    const post = await getPostBySlug(env, slug);
    
    if (!post) {
      return errorResponse('文章不存在', 404);
    }

    const admin = await verifyAuth(request, env);
    const comments = await getComments(env, slug, !!admin);

    return jsonResponse({
      comments,
      total: comments.length,
      allow_comments: post.allow_comments === 1
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 发表评论
export async function onRequestPost(context) {
  const { request, env, params } = context;
  let { slug } = params;
  
  // 解码slug
  try { slug = decodeURIComponent(slug); } catch(e) {}

  try {
    const body = await request.json();
    const { author_name = '匿名', author_email = '', content } = body;

    if (!content || !content.trim()) {
      return errorResponse('评论内容不能为空', 400);
    }

    if (content.length > 2000) {
      return errorResponse('评论内容不能超过2000字', 400);
    }

    const post = await getPostBySlug(env, slug);
    
    if (!post || post.status !== 'published') {
      return errorResponse('文章不存在', 404);
    }

    if (post.allow_comments !== 1) {
      return errorResponse('该文章已关闭评论', 403);
    }

    const ip = getClientIP(request);
    
    // 检查是否需要审核
    const settings = await getSettings(env);
    const needsModeration = settings.comments_moderation === '1';
    const status = needsModeration ? 'pending' : 'approved';

    const comment = {
      id: generateId(),
      author_name: (author_name || '匿名').substring(0, 50),
      author_email: (author_email || '').substring(0, 100),
      content: content.substring(0, 2000),
      ip_address: ip,
      status,
      created_at: new Date().toISOString()
    };

    await addComment(env, slug, comment);

    return jsonResponse({
      id: comment.id,
      message: needsModeration ? '评论提交成功，等待审核' : '评论发表成功',
      status
    }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
