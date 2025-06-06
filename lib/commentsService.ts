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
    const token = session.data.session?.access_token || this.supabaseAnonKey;

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
      throw new Error(`RPC call failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Make direct REST API request to Supabase
   */
  private async makeDirectRequest(endpoint: string, method: string = 'GET', body?: any) {
    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || this.supabaseAnonKey;

    const response = await fetch(`${this.supabaseUrl}/rest/v1/${endpoint}`, {
      method,
      headers: {
        'apikey': this.supabaseAnonKey!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get all comments for a post - FIXED VERSION
   */
  async getPostComments(postId: string): Promise<Comment[]> {
    try {
      console.log('💬 Fetching comments for post:', postId);
      
      // WORKAROUND: Use separate queries since no foreign key relationship exists
      console.log('🔧 Using separate queries workaround for comments');
      
      // First, get all comments for this post
      const comments = await this.makeDirectRequest(
        `post_comments?post_id=eq.${postId}&order=created_at.asc`
      );
      
      if (!comments || !Array.isArray(comments) || comments.length === 0) {
        console.log('⚠️ No comments found');
        return [];
      }

      console.log(`📝 Found ${comments.length} raw comments, fetching user info...`);

      // Get unique user IDs
      const userIds = [...new Set(comments.map((comment: any) => comment.user_id))];
      
      // Fetch user profiles for all user IDs
      const userProfiles: { [key: string]: any } = {};
      
      for (const userId of userIds) {
        try {
          const profiles = await this.makeDirectRequest(
            `user_profiles?user_id=eq.${userId}&select=user_id,username,display_name,avatar_url`
          );
          
          if (profiles && profiles.length > 0) {
            userProfiles[userId] = profiles[0];
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch profile for user ${userId}:`, error);
          userProfiles[userId] = {
            username: 'Unknown',
            display_name: 'Unknown User',
            avatar_url: 'https://via.placeholder.com/40'
          };
        }
      }

      console.log(`✅ Found ${comments.length} comments with user info`);
      
      // Combine comments with user profiles
      return comments.map((comment: any) => {
        const userProfile = userProfiles[comment.user_id] || {
          username: 'Unknown',
          display_name: 'Unknown User',
          avatar_url: 'https://via.placeholder.com/40'
        };
        
        return {
          id: comment.id,
          content: comment.content,
          user_id: comment.user_id,
          username: userProfile.username || 'Unknown',
          display_name: userProfile.display_name || 'Unknown User',
          avatar_url: userProfile.avatar_url || 'https://via.placeholder.com/40',
          parent_comment_id: comment.parent_comment_id,
          like_count: 0, // Post comments table doesn't have like_count
          is_liked_by_user: false, // Would need separate query to check this
          created_at: comment.created_at,
          updated_at: comment.updated_at,
        };
      });
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
      return [];
    }
  }

  /**
   * Create a new comment - FIXED VERSION
   */
  async createComment(params: CreateCommentParams): Promise<{ success: boolean; comment?: Comment; error?: string }> {
    try {
      console.log('💬 Creating comment:', params);

      if (!params.content || params.content.trim().length === 0) {
        return { success: false, error: 'Comment content cannot be empty' };
      }

      // WORKAROUND: Use direct insertion instead of broken RPC function
      console.log('🔧 Using direct insertion workaround for comments');
      
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Insert directly into post_comments table
      const newComments = await this.makeDirectRequest('post_comments', 'POST', {
        post_id: params.post_id,
        user_id: userId,
        content: params.content.trim(),
        parent_comment_id: params.parent_comment_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (newComments && newComments.length > 0) {
        const newComment = newComments[0];
        
        // Update post comment count
        try {
          // Get current count first, then increment
          const currentPost = await this.makeDirectRequest(`posts?id=eq.${params.post_id}&select=comment_count`);
          if (currentPost && currentPost.length > 0) {
            const newCount = (currentPost[0].comment_count || 0) + 1;
            await this.makeDirectRequest(`posts?id=eq.${params.post_id}`, 'PATCH', {
              comment_count: newCount
            });
          }
        } catch (error) {
          console.warn('⚠️ Failed to update comment count:', error);
        }

        // Get user profile info for the response
        try {
          const userProfiles = await this.makeDirectRequest(
            `user_profiles?user_id=eq.${userId}&select=username,display_name,avatar_url`
          );
          
          const userProfile = userProfiles[0] || {};
          
          console.log('✅ Comment created successfully via direct insertion:', newComment.id);
          return {
            success: true,
            comment: {
              id: newComment.id,
              content: newComment.content,
              user_id: newComment.user_id,
              username: userProfile.username || 'Unknown',
              display_name: userProfile.display_name || 'Unknown User',
              avatar_url: userProfile.avatar_url || 'https://via.placeholder.com/40',
              parent_comment_id: newComment.parent_comment_id,
              like_count: 0, // New comments start with 0 likes
              is_liked_by_user: false,
              created_at: newComment.created_at,
              updated_at: newComment.updated_at,
            }
          };
        } catch (error) {
          console.warn('⚠️ Comment created but failed to get user info:', error);
          return {
            success: true,
            comment: {
              id: newComment.id,
              content: newComment.content,
              user_id: newComment.user_id,
              username: 'Unknown',
              display_name: 'Unknown User',
              avatar_url: 'https://via.placeholder.com/40',
              parent_comment_id: newComment.parent_comment_id,
              like_count: 0,
              is_liked_by_user: false,
              created_at: newComment.created_at,
              updated_at: newComment.updated_at,
            }
          };
        }
      } else {
        return { success: false, error: 'Failed to create comment' };
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