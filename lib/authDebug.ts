import { supabaseAuth } from './supabase';
import { userProfileService } from './userProfile';

// Auth debugging utility
export class AuthDebugger {
  
  static async debugCompleteDataFlow() {
    console.log('🔧 === COMPLETE DATA FLOW DEBUG ===');
    
    try {
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        console.log('❌ No current user session');
        return { success: false, error: 'Not authenticated' };
      }
      
      console.log('👤 === USER AUTH DATA ===');
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Auth Metadata:', user.user_metadata);
      console.log('Created:', user.created_at);
      
      // 1. Check local storage onboarding data
      console.log('\n📦 === LOCAL STORAGE ONBOARDING DATA ===');
      const onboardingData = await this.getOnboardingDataDirect();
      console.log('Raw onboarding data:', onboardingData);
      console.log('Username from onboarding:', onboardingData.username);
      console.log('Display name from onboarding:', onboardingData.displayName);
      console.log('Selected media count:', onboardingData.selectedMedia?.length || 0);
      console.log('Onboarding step:', onboardingData.step);
      console.log('Onboarding completed flag:', onboardingData.onboarding_completed);
      
      // 2. Check database profile
      console.log('\n📄 === DATABASE PROFILE ===');
      const profile = await userProfileService.getUserProfile();
      if (profile) {
        console.log('Profile exists in database:', {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          onboarding_completed: profile.onboarding_completed,
          contact_sync_enabled: profile.contact_sync_enabled,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        });
      } else {
        console.log('❌ No profile found in database');
      }
      
      // 3. Check media preferences
      console.log('\n🎬 === DATABASE MEDIA PREFERENCES ===');
      const mediaPrefs = await userProfileService.getUserMediaPreferences();
      console.log('Media preferences count:', mediaPrefs.length);
      mediaPrefs.forEach((item, index) => {
        console.log(`Media ${index + 1}:`, {
          id: item.media_id,
          title: item.title,
          type: item.media_type,
          source: item.source,
          year: item.year,
          image_url: item.image_url
        });
      });
      
      // 4. Test direct database query
      console.log('\n🔍 === DIRECT DATABASE QUERY ===');
      const directProfileResult = await this.queryDatabaseDirect(user.id);
      console.log('Direct database query result:', directProfileResult);
      
      // 5. Test data sync
      console.log('\n🔄 === TESTING DATA SYNC ===');
      if (Object.keys(onboardingData).length > 0) {
        console.log('Attempting to sync onboarding data to database...');
        const syncResult = await this.testDataSync(user.id, onboardingData);
        console.log('Sync test result:', syncResult);
      } else {
        console.log('❌ No onboarding data to sync');
      }
      
      return {
        success: true,
        onboardingData,
        profile,
        mediaPrefs,
        message: 'Complete debug finished - check console for detailed analysis'
      };
      
    } catch (error) {
      console.error('❌ Complete Debug Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Helper to query database directly
  static async queryDatabaseDirect(userId: string) {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return { error: 'Missing Supabase configuration' };
      }
      
      const { data: session } = await supabaseAuth.getSession();
      const token = session.session?.access_token || supabaseKey;
      
      // Query user_profiles table directly
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      const profileData = await profileResponse.json();
      
      // Query user_media_preferences table directly
      const mediaResponse = await fetch(`${supabaseUrl}/rest/v1/user_media_preferences?user_id=eq.${userId}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      const mediaData = await mediaResponse.json();
      
      return {
        profile: profileData,
        media_preferences: mediaData,
        profile_status: profileResponse.status,
        media_status: mediaResponse.status
      };
      
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Database query failed' };
    }
  }
  
  // Helper to test data sync
  static async testDataSync(userId: string, onboardingData: any) {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return { error: 'Missing Supabase configuration' };
      }
      
      const { data: session } = await supabaseAuth.getSession();
      const token = session.session?.access_token || supabaseKey;
      
      // Prepare payload to match the ACTUAL database function signature
      const payload: any = {
        target_user_id: userId,
        // Parameters that actually exist in the deployed Supabase function:
        p_avatar_url: onboardingData.profileImageUrl || null,
        p_contact_sync_enabled: onboardingData.contactsSynced || false,
        p_display_name: onboardingData.displayName || null,
        p_media_preferences: onboardingData.selectedMedia || [],
        p_onboarding_completed: onboardingData.onboarding_completed || false,
      };
      
      // Note: p_username is NOT in the deployed function, so we'll save it separately
      
      console.log('Testing sync with payload:', payload);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      // If RPC succeeds and we have a username, save it separately
      if (response.ok && onboardingData.username) {
        console.log('💾 Saving username separately via direct database update...');
        await this.directUsernameUpdate(userId, onboardingData.username);
      }

      return {
        status: response.status,
        success: response.ok,
        response: responseData,
        payload
      };
      
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Sync test failed',
        success: false 
      };
    }
  }
  
  static async testConnection() {
    console.log('🔧 Testing Supabase Auth Connection...');
    
    try {
      // Test 1: Basic connection
      const { data: session, error } = await supabaseAuth.getSession();
      console.log('✅ Session check:', { hasSession: !!session.session, error });
      
      // Test 2: Test signup with a debug email (only if not currently signed in)
      if (!session.session) {
        console.log('🔧 Testing signup...');
        const testEmail = `test+${Date.now()}@gmail.com`;
        const testPassword = 'TestPassword123!';
        
        const signupResult = await supabaseAuth.signUp({
          email: testEmail,
          password: testPassword,
          options: {
            data: {
              username: 'testuser',
            }
          }
        });
        
        console.log('📝 Signup Result:', {
          user: signupResult.data.user ? 'Created' : 'Not created',
          session: signupResult.data.session ? 'Active' : 'No session',
          error: signupResult.error,
          needsConfirmation: signupResult.data.user && !signupResult.data.session
        });
        
        // Test 3: If signup successful, test signin then cleanup
        if (signupResult.data.user && signupResult.data.session) {
          console.log('🔧 Testing signin...');
          
          // Sign out first
          await supabaseAuth.signOut();
          
          const signinResult = await supabaseAuth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });
          
          console.log('🔑 Signin Result:', {
            user: signinResult.data.user ? 'Found' : 'Not found',
            session: signinResult.data.session ? 'Active' : 'No session',
            error: signinResult.error
          });
          
          // Cleanup: Sign out the test user to avoid interfering with current session
          if (signinResult.data.session) {
            await supabaseAuth.signOut();
            console.log('🧹 Test user signed out for cleanup');
          }
        }
      } else {
        console.log('⚠️ Skipping signup test - user already signed in');
      }
      
      return {
        success: true,
        message: 'Debug complete - check console for details'
      };
      
    } catch (error) {
      console.error('❌ Auth Debug Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async testCurrentUserProfile() {
    console.log('🔧 Testing Current User Profile...');
    
    try {
      // Test 1: Check current session
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        console.log('❌ No current user session');
        return { success: false, error: 'Not authenticated' };
      }
      
      console.log('👤 Current User:', {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
        created_at: user.created_at,
      });
      
      // Test 2: Check if profile exists in database
      console.log('🔧 Checking profile in database...');
      const profile = await userProfileService.getUserProfile();
      
      console.log('📄 Profile Data:', {
        exists: !!profile,
        id: profile?.id,
        username: profile?.username,
        display_name: profile?.display_name,
        bio: profile?.bio,
        avatar_url: profile?.avatar_url,
        onboarding_completed: profile?.onboarding_completed,
      });
      
      // Test 3: Check media preferences
      console.log('🔧 Checking media preferences...');
      const mediaPrefs = await userProfileService.getUserMediaPreferences();
      
      console.log('🎬 Media Preferences:', {
        count: mediaPrefs.length,
        items: mediaPrefs.map(item => ({
          id: item.media_id,
          title: item.title,
          type: item.media_type
        }))
      });
      
      return {
        success: true,
        profile,
        mediaPrefs,
        message: 'Profile debug complete - check console for details'
      };
      
    } catch (error) {
      console.error('❌ Profile Debug Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async fixUsernameFromOnboarding() {
    console.log('🔧 Fixing Username from Onboarding Data...');
    
    try {
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // Get onboarding data from localStorage
      const onboardingData = await this.getOnboardingDataDirect();
      console.log('📦 Onboarding Data:', onboardingData);
      
      // Check current profile
      const existingProfile = await userProfileService.getUserProfile();
      console.log('👤 Current Profile:', existingProfile);
      
      // Determine what username to use
      let usernameToSet = existingProfile?.username;
      let displayNameToSet = existingProfile?.display_name;
      
      // Priority: onboarding data > auth metadata > email fallback
      if (onboardingData.username) {
        usernameToSet = onboardingData.username;
        console.log('✅ Found username in onboarding data:', usernameToSet);
      } else if (user.user_metadata?.username) {
        usernameToSet = user.user_metadata.username;
        console.log('✅ Found username in auth metadata:', usernameToSet);
      } else if (!usernameToSet) {
        usernameToSet = user.email?.split('@')[0]?.toLowerCase()?.replace(/[^a-z0-9]/g, '');
        console.log('✅ Generated username from email:', usernameToSet);
      }
      
      if (onboardingData.displayName) {
        displayNameToSet = onboardingData.displayName;
        console.log('✅ Found display name in onboarding data:', displayNameToSet);
      } else if (!displayNameToSet) {
        displayNameToSet = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
        console.log('✅ Generated display name:', displayNameToSet);
      }
      
      // Update profile if we have missing data
      const needsUpdate = !existingProfile?.username || !existingProfile?.display_name ||
                         existingProfile.username !== usernameToSet ||
                         existingProfile.display_name !== displayNameToSet;
      
      if (!needsUpdate) {
        console.log('✅ Profile already has complete username and display name');
        return {
          success: true,
          profile: existingProfile,
          message: 'Profile already complete - no changes needed'
        };
      }
      
      const updates = {
        username: usernameToSet,
        display_name: displayNameToSet,
        bio: existingProfile?.bio || 'Welcome to my profile!',
      };
      
      console.log('🔧 Updating profile with:', updates);
      
      const result = await userProfileService.updateUserProfile(updates);
      
      if (result.success) {
        // Give a moment for the update to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch updated profile
        const profile = await userProfileService.getUserProfile();
        console.log('📄 Updated Profile:', profile);
        
        return {
          success: true,
          profile,
          message: 'Username and display name fixed successfully!'
        };
      } else {
        return {
          success: false,
          error: result.error || 'Profile update failed'
        };
      }
      
    } catch (error) {
      console.error('❌ Username Fix Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Helper function to get onboarding data directly from AsyncStorage
  static async getOnboardingDataDirect(): Promise<any> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const data = await AsyncStorage.getItem('onboarding_data');
      return data ? JSON.parse(data) : {};
    } catch (err) {
      console.error('Error getting onboarding data:', err);
      return {};
    }
  }
  
  static async testCreateMissingProfile() {
    console.log('🔧 Testing Profile Creation...');
    
    try {
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // Check if profile already exists
      const existingProfile = await userProfileService.getUserProfile();
      
      if (existingProfile && existingProfile.display_name && existingProfile.username) {
        console.log('✅ Profile already exists with complete data:', existingProfile);
        return {
          success: true,
          profile: existingProfile,
          message: 'Profile already complete - no changes needed'
        };
      }
      
      // Try to create/update profile with basic info
      const updates = {
        display_name: existingProfile?.display_name || 
                     user.user_metadata?.username || 
                     user.user_metadata?.display_name ||
                     user.email?.split('@')[0] || 
                     'User',
        username: existingProfile?.username ||
                 user.user_metadata?.username || 
                 user.email?.split('@')[0]?.toLowerCase()?.replace(/[^a-z0-9]/g, ''),
        bio: existingProfile?.bio || 'Welcome to my profile!',
      };
      
      console.log('🔧 Creating/updating profile with:', updates);
      
      const result = await userProfileService.updateUserProfile(updates);
      
      console.log('📝 Profile Update Result:', result);
      
      if (result.success) {
        // Give a moment for the update to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch updated profile
        const profile = await userProfileService.getUserProfile();
        console.log('📄 Updated Profile:', profile);
        
        return {
          success: true,
          profile,
          message: 'Profile created/updated successfully'
        };
      } else {
        return {
          success: false,
          error: result.error || 'Profile update failed'
        };
      }
      
    } catch (error) {
      console.error('❌ Profile Creation Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async testEnvironmentVariables() {
    console.log('🔧 Testing Environment Variables...');
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('📋 Environment Check:', {
      hasUrl: !!supabaseUrl,
      urlFormat: supabaseUrl ? (supabaseUrl.includes('supabase.co') ? 'Valid' : 'Invalid format') : 'Missing',
      hasKey: !!supabaseKey,
      keyFormat: supabaseKey ? (supabaseKey.startsWith('eyJ') ? 'Valid JWT' : 'Invalid format') : 'Missing'
    });
    
    if (supabaseUrl) {
      console.log('🌐 Supabase URL:', supabaseUrl);
    }
    
    if (supabaseKey) {
      console.log('🔑 Supabase Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
    }
  }
  
  static async testDirectHttpRequest() {
    console.log('🔧 Testing Direct HTTP Request...');
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing environment variables');
      return;
    }
    
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      
      const data = await response.json();
      
      console.log('🔧 Auth Settings:', {
        status: response.status,
        emailEnabled: data.external?.email,
        signupDisabled: data.disable_signup,
        emailConfirmRequired: !data.mailer_autoconfirm,
        settings: data
      });
      
    } catch (error) {
      console.error('❌ HTTP Request Error:', error);
    }
  }
  
  static async fixUserDataFromProfile() {
    console.log('🔧 === FIXING USER DATA FROM PROFILE ===');
    
    try {
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('👤 Current Auth User:', {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
        created_at: user.created_at,
      });

      // Step 1: Clear stale onboarding data
      console.log('🧹 Clearing stale onboarding data...');
      await this.clearOnboardingData();

      // Step 2: Generate proper username and display name from auth data
      const emailPrefix = user.email?.split('@')[0]?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || 'user';
      const suggestedUsername = emailPrefix;
      const suggestedDisplayName = user.user_metadata?.full_name || 
                                   user.user_metadata?.display_name || 
                                   user.user_metadata?.name ||
                                   emailPrefix;

      console.log('💡 Generated suggestions:', {
        username: suggestedUsername,
        displayName: suggestedDisplayName,
      });

      // Step 3: Save proper data to database using sync function
      console.log('💾 Saving corrected data to database...');
      const syncResult = await this.testDataSync(user.id, {
        username: suggestedUsername,
        displayName: suggestedDisplayName,
        onboarding_completed: true,
        selectedMedia: [] // Start with empty array - user can add later
      });

      console.log('✅ Data fix result:', syncResult);

      // Step 4: If sync didn't work, try direct database update
      if (!syncResult.success || syncResult.status !== 200) {
        console.log('⚠️ RPC sync failed, trying direct database update...');
        const directResult = await this.directUsernameUpdate(user.id, suggestedUsername);
        console.log('🔧 Direct update result:', directResult);
      }

      // Step 5: IMPORTANT - Set onboarding completed flag in AsyncStorage
      console.log('🏁 Setting onboarding completion flag...');
      await this.setOnboardingCompleted();

      // Step 6: Verify the fix worked
      console.log('🔍 Verifying fix...');
      const updatedProfile = await userProfileService.getUserProfile();
      console.log('📄 Updated Profile:', {
        username: updatedProfile?.username,
        display_name: updatedProfile?.display_name,
        onboarding_completed: updatedProfile?.onboarding_completed,
      });

      return {
        success: true,
        message: 'User data fixed successfully',
        profile: updatedProfile,
        suggestions: {
          username: suggestedUsername,
          displayName: suggestedDisplayName,
        }
      };

    } catch (error) {
      console.error('❌ Error fixing user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper to save username directly to user_profiles table
   */
  static async directUsernameUpdate(userId: string, username: string): Promise<void> {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.log('🔧 Supabase configuration missing - skipping username save');
        return;
      }

      const { data: session } = await supabaseAuth.getSession();
      const token = session.session?.access_token || supabaseKey;

      const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username,
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Username save error:', response.status, errorData);
        return;
      }

      console.log('✅ Username saved directly to database via debug helper');

    } catch (error) {
      console.error('❌ Error saving username directly via debug helper:', error);
    }
  }

  // Helper to clear onboarding data
  static async clearOnboardingData() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('onboarding_data');
      await AsyncStorage.removeItem('onboarding_completed');
      console.log('✅ Onboarding data cleared');
    } catch (error) {
      console.error('❌ Error clearing onboarding data:', error);
    }
  }

  // Helper to set onboarding completed flag
  static async setOnboardingCompleted() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('onboarding_completed', 'true');
      console.log('✅ Onboarding completion flag set');
    } catch (error) {
      console.error('❌ Error setting onboarding completion flag:', error);
    }
  }

  // Quick fix for onboarding completion issue
  static async fixOnboardingCompletion() {
    console.log('🏁 === FIXING ONBOARDING COMPLETION ===');
    
    try {
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('🏁 Setting onboarding as completed for authenticated user...');
      await this.setOnboardingCompleted();

      console.log('✅ Onboarding completion flag set successfully');
      return {
        success: true,
        message: 'Onboarding marked as completed - app should now route to main tabs'
      };

    } catch (error) {
      console.error('❌ Error fixing onboarding completion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async addSampleMediaPreferences() {
    console.log('🎬 === ADDING SAMPLE MEDIA PREFERENCES ===');
    
    try {
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const sampleMedia = [
        {
          id: 'popular_movie_1',
          title: 'The Shawshank Redemption',
          type: 'movie',
          year: '1994',
          image: 'https://image.tmdb.org/t/p/w300/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
          description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption.',
          source: 'popular',
          originalId: 'tmdb_278'
        },
        {
          id: 'popular_tv_1',
          title: 'Breaking Bad',
          type: 'tv',
          year: '2008',
          image: 'https://image.tmdb.org/t/p/w300/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
          description: 'A high school chemistry teacher turned methamphetamine producer.',
          source: 'popular',
          originalId: 'tmdb_1396'
        },
        {
          id: 'popular_book_1',
          title: 'To Kill a Mockingbird',
          type: 'book',
          year: '1960',
          image: 'https://books.google.com/books/content/images/frontcover/PGR2AwAAQBAJ?fife=w300-h400',
          description: 'A classic novel about racial injustice and childhood innocence.',
          source: 'popular',
          originalId: 'book_PGR2AwAAQBAJ'
        }
      ];

      console.log('💾 Adding sample media preferences...');
      const syncResult = await this.testDataSync(user.id, {
        selectedMedia: sampleMedia
      });

      console.log('✅ Sample media added:', syncResult);

      // Verify it worked
      const mediaPrefs = await userProfileService.getUserMediaPreferences();
      console.log('🔍 Verified media preferences count:', mediaPrefs.length);

      return {
        success: true,
        message: `Added ${sampleMedia.length} sample media items`,
        mediaCount: mediaPrefs.length
      };

    } catch (error) {
      console.error('❌ Error adding sample media:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async testLogoutFlow() {
    console.log('🚪 === TESTING LOGOUT FLOW ===');
    
    try {
      // Check current state before logout
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      console.log('📋 Current state before logout:', {
        authenticated: !!user,
        userEmail: user?.email,
      });

      // Check local storage before logout
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const onboardingData = await AsyncStorage.getItem('onboarding_data');
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');

      console.log('📦 Local storage before logout:', {
        onboardingData: onboardingData ? JSON.parse(onboardingData) : null,
        onboardingCompleted: onboardingCompleted,
      });

      if (!user) {
        return {
          success: true,
          message: 'Already logged out - no action needed'
        };
      }

      // Perform logout
      console.log('🔄 Performing logout...');
      const { error } = await supabaseAuth.signOut();

      if (error) {
        console.error('❌ Logout error:', error);
        return {
          success: false,
          error: error.message || 'Logout failed'
        };
      }

      // Verify logout worked
      console.log('🔍 Verifying logout...');
      const { data: newSession } = await supabaseAuth.getSession();
      const newOnboardingData = await AsyncStorage.getItem('onboarding_data');
      const newOnboardingCompleted = await AsyncStorage.getItem('onboarding_completed');

      console.log('📋 State after logout:', {
        authenticated: !!newSession.session?.user,
        onboardingData: newOnboardingData,
        onboardingCompleted: newOnboardingCompleted,
      });

      const isProperlyLoggedOut = !newSession.session?.user && 
                                  !newOnboardingData && 
                                  !newOnboardingCompleted;

      return {
        success: isProperlyLoggedOut,
        message: isProperlyLoggedOut 
          ? 'Logout successful - all data cleared' 
          : 'Logout incomplete - some data may remain',
        details: {
          sessionCleared: !newSession.session?.user,
          onboardingDataCleared: !newOnboardingData,
          onboardingCompletedCleared: !newOnboardingCompleted,
        }
      };

    } catch (error) {
      console.error('❌ Error testing logout flow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Add to global for easy testing in development
if (__DEV__) {
  (global as any).AuthDebugger = AuthDebugger;
} 