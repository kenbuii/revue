import { supabaseAuth } from './supabase';

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  parent_comment_id?: string;
  like_count: number;
  is_liked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentParams {
  post_id: string;
  content: string;
  parent_comment_id?: string;
}

class CommentsService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  /**
   * Make authenticated RPC call to Supabase
   */
  private async callRPC(functionName: string, params: any = {}) {
    const session = await supabaseAuth.getSession();
    
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required for comments');
    }
    
    const token = session.data.session.access_token;

    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'apikey': this.supabaseAnonKey!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`RPC call failed: ${response.status} - ${error}`);
      throw new Error(`Failed to ${functionName}: ${error}`);
    }

    const result = await response.json();
    
    if (result === null) {
      throw new Error(`${functionName} returned null - check authentication context`);
    }

    return result;
  }

  /**
   * Get all comments for a post
   */
  async getPostComments(postId: string): Promise<Comment[]> {
    try {
      console.log('💬 Fetching comments for post:', postId);
      
      const result = await this.callRPC('get_post_comments', { p_post_id: postId });
      
      if (!result || !Array.isArray(result)) {
        console.log('⚠️ No comments found or invalid response');
        return [];
      }

      console.log(`✅ Found ${result.length} comments`);
      return result.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        user_id: comment.user_id,
        username: comment.username,
        display_name: comment.display_name,
        avatar_url: comment.avatar_url || 'https://via.placeholder.com/40',
        parent_comment_id: comment.parent_comment_id,
        like_count: comment.like_count || 0,
        is_liked_by_user: comment.is_liked_by_user || false,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
      }));
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
      return [];
    }
  }

  /**
   * Create a new comment
   */
  async createComment(params: CreateCommentParams): Promise<{ success: boolean; comment?: Comment; error?: string }> {
    try {
      console.log('💬 Creating comment:', params);

      if (!params.content || params.content.trim().length === 0) {
        return { success: false, error: 'Comment content cannot be empty' };
      }

      const result = await this.callRPC('create_comment', {
        p_post_id: params.post_id,
        p_content: params.content.trim(),
        p_parent_comment_id: params.parent_comment_id || null,
      });

      if (result.success && result.comment) {
        console.log('✅ Comment created successfully:', result.comment.id);
        return {
          success: true,
          comment: {
            id: result.comment.id,
            content: result.comment.content,
            user_id: result.comment.user_id,
            username: result.comment.username,
            display_name: result.comment.display_name,
            avatar_url: result.comment.avatar_url || 'https://via.placeholder.com/40',
            parent_comment_id: result.comment.parent_comment_id,
            like_count: result.comment.like_count || 0,
            is_liked_by_user: result.comment.is_liked_by_user || false,
            created_at: result.comment.created_at,
            updated_at: result.comment.updated_at,
          }
        };
      } else {
        console.error('❌ Comment creation failed:', result.error);
        return { success: false, error: result.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('❌ Error creating comment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Toggle like on a comment
   */
  async likeComment(commentId: string): Promise<{ success: boolean; isLiked?: boolean; likeCount?: number; error?: string }> {
    try {
      console.log('👍 Toggling like on comment:', commentId);

      const result = await this.callRPC('toggle_comment_like', { p_comment_id: commentId });

      if (result.success) {
        console.log(`✅ Comment like toggled - now ${result.isLiked ? 'liked' : 'unliked'}`);
        return {
          success: true,
          isLiked: result.isLiked,
          likeCount: result.likeCount,
        };
      } else {
        console.error('❌ Comment like toggle failed:', result.error);
        return { success: false, error: result.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('❌ Error toggling comment like:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete a comment (if user owns it)
   * Note: This function would need to be implemented in the database
   */
  async deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting comment:', commentId);
      
      // TODO: Implement delete_comment function in database
      // For now, return not implemented
      return { 
        success: false, 
        error: 'Comment deletion not yet implemented' 
      };
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Format comment timestamp for display
   */
  formatCommentTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 60 * 24) {
        return `${Math.floor(diffInMinutes / 60)}h ago`;
      } else if (diffInMinutes < 60 * 24 * 7) {
        return `${Math.floor(diffInMinutes / (60 * 24))}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.warn('Error formatting comment time:', error);
      return 'Unknown time';
    }
  }
}

export const commentsService = new CommentsService(); 