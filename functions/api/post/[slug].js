import { jsonResponse, errorResponse, verifyAuth, generateSummary, generateSlug, getPostBySlug, savePost, deletePost } from '../../_utils';

// 解码slug
function decodeSlug(slug) {
  try { return decodeURIComponent(slug); } catch(e) { return slug; }
}

// 获取单篇文章
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const slug = decodeSlug(params.slug);

  try {
    const post = await getPostBySlug(env, slug);

    if (!post) {
      return errorResponse('文章不存在', 404);
    }

    const admin = await verifyAuth(request, env);
    if (post.status === 'draft' && !admin) {
      return errorResponse('文章不存在', 404);
    }

    // 增加阅读量
    if (!admin) {
      post.views = (post.views || 0) + 1;
      await savePost(env, post);
    }

    return jsonResponse({ post });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 更新文章
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const slug = decodeSlug(params.slug);

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const body = await request.json();
    const { title, content, status, allow_comments, cover_image, slug: newSlug } = body;

    const existing = await getPostBySlug(env, slug);
    if (!existing) {
      return errorResponse('文章不存在', 404);
    }

    let finalSlug = slug;
    
    if (newSlug !== undefined && newSlug !== slug) {
      // 检查新slug是否已被其他文章使用
      const slugExists = await getPostBySlug(env, newSlug);
      if (slugExists) {
        return errorResponse('URL别名已存在', 400);
      }
      finalSlug = newSlug;
      
      // 删除旧的
      await env.BLOG_KV.delete(`post:${slug}`);
      
      // 更新列表中的slug
      const postsData = await env.BLOG_KV.get('posts:list', { type: 'json' });
      let posts = postsData || [];
      const idx = posts.findIndex(p => p.slug === slug);
      if (idx >= 0) {
        posts[idx].slug = finalSlug;
        await env.BLOG_KV.put('posts:list', JSON.stringify(posts));
      }
      
      // 迁移评论
      const oldComments = await env.BLOG_KV.get(`comments:${slug}`, { type: 'json' });
      if (oldComments) {
        await env.BLOG_KV.put(`comments:${finalSlug}`, JSON.stringify(oldComments));
        await env.BLOG_KV.delete(`comments:${slug}`);
      }
      
      existing.slug = finalSlug;
    }

    if (title !== undefined) existing.title = title;
    if (content !== undefined) {
      existing.content = content;
      existing.summary = generateSummary(content);
    }
    if (status !== undefined) existing.status = status;
    if (allow_comments !== undefined) existing.allow_comments = allow_comments ? 1 : 0;
    if (cover_image !== undefined) existing.cover_image = cover_image;
    
    existing.updated_at = new Date().toISOString();

    await savePost(env, existing);

    return jsonResponse({ message: '更新成功', slug: finalSlug });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

// 删除文章
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const slug = decodeSlug(params.slug);

  const admin = await verifyAuth(request, env);
  if (!admin) {
    return errorResponse('请先登录', 401);
  }

  try {
    const existing = await getPostBySlug(env, slug);
    if (!existing) {
      return errorResponse('文章不存在', 404);
    }

    await deletePost(env, slug);
    return jsonResponse({ message: '删除成功' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
