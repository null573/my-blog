import { jsonResponse, errorResponse, verifyAuth, getPostsList, getComments, deleteComment, updateCommentStatus } from '../../../_utils';

// 管理员删除评论
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const { id } = params;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    // 遍历所有文章找到该评论
    const result = await getPostsList(env, 'all', 1, 1000);
    let found = false;

    for (const post of result.posts) {
      const comments = await getComments(env, post.slug, true);
      const comment = comments.find(c => c.id === id);
      if (comment) {
        await deleteComment(env, post.slug, id);
        found = true;
        break;
      }
    }

    if (!found) {
      return errorResponse('评论不存在', 404);
    }

    return jsonResponse({ message: '删除成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 管理员审核评论
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { id } = params;

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!['approved', 'pending', 'spam'].includes(status)) {
      return errorResponse('无效的状态', 400);
    }

    // 遍历所有文章找到该评论
    const result = await getPostsList(env, 'all', 1, 1000);
    let found = false;

    for (const post of result.posts) {
      const comments = await getComments(env, post.slug, true);
      const comment = comments.find(c => c.id === id);
      if (comment) {
        await updateCommentStatus(env, post.slug, id, status);
        found = true;
        break;
      }
    }

    if (!found) {
      return errorResponse('评论不存在', 404);
    }

    return jsonResponse({ message: '状态更新成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
