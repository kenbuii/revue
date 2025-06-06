Based on my analysis of the codebase, I'll break down the implementation into a clear, cohesive strategy with discrete, concrete steps. Here's the comprehensive plan:
Phase 1: Database Schema Enhancement
Step 1.1: Extend Comments Schema
Add comment_likes table with like_count for each comment
Add triggers to update comment like counts
Add RLS policies for comment likes
Step 1.2: Extend Posts Schema
Add hidden_posts table to track user-hidden posts
Add functions for hiding/unhiding posts
Update post_likes to properly sync with the favorites system
Phase 2: Backend Service Layer
Step 2.1: Create Comments Service (lib/commentsService.ts)
getPostComments(postId) - fetch real comments from database
createComment(postId, content) - create new comment
likeComment(commentId) - toggle comment like
deleteComment(commentId) - for comment management
Step 2.2: Create Likes Service (lib/likesService.ts)
getPostLikes(postId) - fetch users who liked a post
togglePostLike(postId) - like/unlike post (merge with favorites)
getUserLikedPosts(userId) - for profile display
Step 2.3: Create Hidden Posts Service (lib/hiddenPostsService.ts)
hidePost(postId) - hide post for current user
getUserHiddenPosts() - get list of hidden post IDs
filterHiddenPosts(posts) - utility to filter feed
Step 2.4: Extend Media Service
Fix getMediaById(id) to return proper media data instead of empty params
Add proper error handling for missing media
Phase 3: UI Component Refactoring
Step 3.1: Create Reusable Post Components
PostHeader.tsx - user info, media info, post options
PostContent.tsx - handles text/image/mixed content display
PostActions.tsx - like, comment, bookmark, share actions
PostStats.tsx - displays like count, comment count
Step 3.2: Create Reusable Comment Components
CommentItem.tsx - individual comment with like functionality
CommentsList.tsx - scrollable list of comments
CommentInput.tsx - comment creation input
Step 3.3: Enhance Modals
Update CommentsModal.tsx to use real data and posting
Update LikesModal.tsx to fetch and display real users
Add loading states and error handling
Phase 4: Context & State Management Updates
Step 4.1: Merge Like & Favorite Functionality
Update FavoritesContext.tsx to handle both star (favorites) and heart (likes)
Rename to PostInteractionsContext.tsx for clarity
Add like/unlike methods that sync with database
Step 4.2: Create Comments Context (CommentsContext.tsx)
Manage comment state across modals and detail pages
Handle comment creation, liking, and real-time updates
Cache comments to avoid refetching
Step 4.3: Create Hidden Posts Context (HiddenPostsContext.tsx)
Track hidden posts locally and in database
Filter posts in feed automatically
Handle report → hide workflow
Phase 5: Page Updates
Step 5.1: Enhance Post Detail Page (app/post/[id].tsx)
Use reusable components instead of inline code
Connect to real comments service
Add proper error handling and loading states
Enable real comment posting and liking
Step 5.2: Fix Media Detail Page (app/media/[id].tsx)
Fix empty localSearchParams by calling media service properly
Add error handling for missing media
Ensure proper navigation with media data
Step 5.3: Update Post Card (components/PostCard.tsx)
Merge heart and star functionality (both should like/favorite)
Connect to hidden posts context for filtering
Add proper like count incrementation
Connect report flow to auto-hide functionality
Phase 6: Feed Integration
Step 6.1: Update Feed Service (lib/feedService.ts)
Integrate hidden posts filtering
Add proper like counts and user like status
Include comment counts from database
Step 6.2: Update Profile Pages
Show liked/favorited posts in user profile
Display proper counts and interactions
Handle hidden posts in personal feed
Phase 7: Error Handling & Polish
Step 7.1: Add Comprehensive Error Handling
Network failure recovery
Offline state management
User-friendly error messages
Step 7.2: Add Loading States
Skeleton screens for comments loading
Like button loading states
Smooth transitions between states
Step 7.3: Add Confirmation Flows
Post hiding confirmation
Report post confirmation with auto-hide
Comment deletion confirmation
Implementation Priority Order:
Database schema updates (Foundation)
Comments service & context (Core functionality)
Reusable post components (UI foundation)
Merge like/favorite systems (Critical UX)
Fix media detail page (Bug fix)
Hidden posts functionality (User control)
Enhanced modals (Improved UX)
Feed integration (System integration)
Error handling & polish (Production readiness)
This approach ensures each component builds upon the previous one, maintaining functionality throughout development while systematically implementing all requested features. Would you like me to start implementing this plan, beginning with the database schema updates?
