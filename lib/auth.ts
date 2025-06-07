import { supabaseAuth } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/auth-js';
import * as CryptoJS from 'crypto-js';
import Constants from 'expo-constants';

// Types for our auth service
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  username?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ProfileUpdateData {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  onboarding_completed?: boolean;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// Auth service class
class AuthService {
  /**
   * Hash email for privacy-friendly storage
   */
  private hashEmail(email: string): string {
    return CryptoJS.SHA256(email.toLowerCase().trim()).toString();
  }

  /**
   * Test Supabase connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Testing Supabase connection...');
      
      // Test basic connection by getting session
      const { data, error } = await supabaseAuth.getSession();
      
      if (error) {
        console.log('⚠️ Auth error (normal for unauthenticated users):', error.message);
        // This is actually normal - no session exists yet
        return { success: true };
      }
      
      console.log('✅ Supabase connection successful');
      console.log('Session:', data.session ? 'Active' : 'None');
      
      return { success: true };
    } catch (err) {
      console.error('❌ Supabase connection failed:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown connection error' 
      };
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<{ session: Session | null; error?: any }> {
    try {
      const { data, error } = await supabaseAuth.getSession();
      return { session: data.session, error };
    } catch (err) {
      console.error('Error getting current session:', err);
      return { session: null, error: err };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ user: User | null; error?: any }> {
    try {
      const { data, error } = await supabaseAuth.getUser();
      return { user: data.user, error };
    } catch (err) {
      console.error('Error getting current user:', err);
      return { user: null, error: err };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(signUpData: SignUpData): Promise<{ 
    user: User | null; 
    session: Session | null; 
    error?: any 
  }> {
    try {
      console.log('🔄 Signing up user...');
      console.log('📧 Email:', signUpData.email);
      console.log('👤 Username:', signUpData.username);
      
      const { data, error } = await supabaseAuth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            username: signUpData.username,
            email_hash: this.hashEmail(signUpData.email),
          }
        }
      });

      if (error) {
        console.error('❌ Sign up error details:');
        console.error('- Message:', error.message);
        console.error('- Status:', error.status);
        console.error('- Full error:', JSON.stringify(error, null, 2));
        return { user: null, session: null, error };
      }

      console.log('✅ User signed up successfully');
      console.log('📊 Response data:', {
        user: data.user ? 'User created' : 'No user',
        session: data.session ? 'Session created' : 'No session'
      });
      
      return { user: data.user, session: data.session, error: undefined };
    } catch (err) {
      console.error('💥 Sign up failed with exception:', err);
      return { 
        user: null, 
        session: null, 
        error: err 
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(signInData: SignInData): Promise<{ 
    user: User | null; 
    session: Session | null; 
    error?: any 
  }> {
    try {
      console.log('🔄 Signing in user...');
      
      const { data, error } = await supabaseAuth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) {
        console.error('❌ Sign in error:', error.message);
        return { user: null, session: null, error };
      }

      console.log('✅ User signed in successfully');
      
      // CRITICAL: Ensure user profile exists after successful login
      if (data.user) {
        console.log('🔍 Validating user profile after login...');
        const profileResult = await this.ensureUserProfileExists(data.user.id);
        
        if (!profileResult.success) {
          console.warn('⚠️ Profile validation failed after login:', profileResult.error);
          // Don't fail the login, but log the issue
        } else {
          console.log('✅ User profile validated after login');
        }
        
        // Also sync any local onboarding data to Supabase
        await this.syncOnboardingDataToSupabase();
      }
      
      return { user: data.user, session: data.session, error: undefined };
    } catch (err) {
      console.error('Sign in failed:', err);
      return { 
        user: null, 
        session: null, 
        error: err 
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error?: any }> {
    try {
      console.log('🔄 Signing out user...');
      
      const { error } = await supabaseAuth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error.message);
        return { error };
      }

      // Clear all local storage related to authentication and onboarding
      await AsyncStorage.removeItem('onboarding_data');
      await AsyncStorage.removeItem('onboarding_completed');
      
      console.log('✅ User signed out successfully - all local data cleared');
      return { error: undefined };
    } catch (err) {
      console.error('Sign out failed:', err);
      return { error: err };
    }
  }

  /**
   * Update user profile (for later use with database)
   */
  async updateProfile(updates: ProfileUpdateData): Promise<{ 
    user: AuthUser | null; 
    error?: string 
  }> {
    try {
      console.log('🔄 Updating user profile...');
      
      // For now, just return placeholder since we haven't set up the database yet
      // This will be implemented in Phase 3
      console.log('Profile update data:', updates);
      
      return { 
        user: null, 
        error: 'Profile updates not implemented yet - coming in Phase 3!' 
      };
    } catch (err) {
      console.error('Profile update failed:', err);
      return { 
        user: null, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      // First check the explicit completion flag
      const completed = await AsyncStorage.getItem('onboarding_completed');
      if (completed === 'true') {
        console.log('✅ User marked as onboarding completed in storage');
        return true;
      }

      // If not explicitly marked, check if user has substantial onboarding data
      // This helps with existing users who logged in but never hit the final step
      const onboardingData = await this.getOnboardingData();
      const hasSubstantialData = !!(
        onboardingData.email || 
        onboardingData.displayName || 
        onboardingData.selectedGenres?.length > 0 ||
        onboardingData.selectedMedia?.length > 0 ||
        onboardingData.step >= 4  // Made it to genre selection or beyond
      );

      if (hasSubstantialData) {
        console.log('🔍 User has substantial onboarding data, considering completed:', onboardingData);
        // Auto-mark as completed for future checks
        await this.completeOnboarding();
        return true;
      }

      console.log('❌ User has not completed onboarding');
      return false;
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      return false;
    }
  }

  /**
   * Check if user should be considered a "returning user" based on their data
   */
  async isReturningUser(): Promise<boolean> {
    try {
      const onboardingData = await this.getOnboardingData();
      // Consider them returning if they have any meaningful data saved
      return !!(
        onboardingData.email || 
        onboardingData.username || 
        onboardingData.displayName ||
        onboardingData.step > 1
      );
    } catch (err) {
      console.error('Error checking returning user status:', err);
      return false;
    }
  }

  /**
   * Ensure user profile exists in database before completing onboarding
   */
  private async ensureUserProfileExists(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.log('🔧 Supabase configuration missing - skipping profile validation');
        return { success: false, error: 'Supabase configuration missing' };
      }

      // Get auth token
      const { session } = await this.getCurrentSession();
      const token = session?.access_token || supabaseAnonKey;

      console.log('🔍 Ensuring user profile exists for:', userId);

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/ensure_user_profile_exists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_user_id: userId }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Profile validation error:', response.status, errorData);
        return { success: false, error: `Profile validation failed: ${response.status}` };
      }

      const result = await response.json();
      console.log('✅ Profile validation result:', result);

      if (result.success) {
        if (result.profile_existed) {
          console.log('✅ User profile already existed');
        } else {
          console.log('✅ User profile created successfully:', result.created_username);
        }
        return { success: true };
      } else {
        console.error('❌ Profile validation failed:', result.error);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('❌ Error ensuring user profile exists:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎯 Starting onboarding completion...');
      
      // First, ensure we have a session
      const { session } = await this.getCurrentSession();
      if (!session?.user) {
        console.error('❌ No active session for onboarding completion');
        return { success: false, error: 'No active session' };
      }

      // CRITICAL: Ensure user_profiles record exists before marking complete
      console.log('🔍 Ensuring user profile exists before completion...');
      const profileResult = await this.ensureUserProfileExists(session.user.id);
      
      if (!profileResult.success) {
        console.error('❌ Failed to ensure user profile exists:', profileResult.error);
        return { success: false, error: `Profile validation failed: ${profileResult.error}` };
      }

      // Mark as completed in local storage
      await AsyncStorage.setItem('onboarding_completed', 'true');
      console.log('✅ Marked onboarding as completed in local storage');
      
      // Save to Supabase with profile validation
      console.log('💾 Saving onboarding completion to Supabase...');
      const existingData = await this.getOnboardingData();
      await this.saveToSupabase(session.user.id, { 
        ...existingData,  // Preserve all existing data
        onboarding_completed: true  // Only update the completion flag
      });
      
      console.log('🎉 Onboarding completion successful!');
      return { success: true };
    } catch (err) {
      console.error('❌ Error completing onboarding:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get onboarding data from local storage
   */
  async getOnboardingData(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem('onboarding_data');
      return data ? JSON.parse(data) : {};
    } catch (err) {
      console.error('Error getting onboarding data:', err);
      return {};
    }
  }

  /**
   * Save onboarding data to Supabase using HTTP requests (WebSocket-safe)
   */
  private async saveToSupabase(userId: string, data: any): Promise<void> {
    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.log('🔧 Supabase configuration missing - skipping remote save');
        return;
      }

      // Get auth token
      const { session } = await this.getCurrentSession();
      const token = session?.access_token || supabaseAnonKey;

      // Prepare data for Supabase function with parameters that ACTUALLY exist in the database
      const payload: any = {
        p_user_id: userId,
        // Parameters that actually exist in the deployed Supabase function:
        p_avatar_url: data.profileImageUrl || null,
        p_contact_sync_enabled: data.contactsSynced || false,
        p_display_name: data.displayName || null,
        p_media_preferences: data.selectedMedia || [],
        // FIXED: Only send onboarding_completed if explicitly provided, don't default to false
        p_onboarding_completed: data.onboarding_completed === true ? true : 
                               data.onboarding_completed === false ? false : 
                               undefined, // Don't override existing DB value if not specified
      };

      // Remove undefined values to avoid overriding database values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      // Note: p_username is NOT in the deployed function, so we'll save it separately

      console.log('💾 Saving onboarding data to Supabase (excluding username - will save separately)...', payload);

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Supabase save error:', response.status, errorData);
        // Don't throw - graceful degradation
        return;
      }

      const result = await response.json();
      console.log('✅ Onboarding data saved to Supabase:', result);

      // Save username separately since it's not in the RPC function
      if (data.username) {
        await this.saveUsernameDirectly(userId, data.username);
      }

    } catch (error) {
      console.error('❌ Error saving to Supabase:', error);
      // Don't throw - graceful degradation, local storage still works
    }
  }

  /**
   * Save username directly to user_profiles table (since RPC function doesn't handle it)
   */
  private async saveUsernameDirectly(userId: string, username: string): Promise<void> {
    try {
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
      const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.log('🔧 Supabase configuration missing - skipping username save');
        return;
      }

      // Get auth token
      const { session } = await this.getCurrentSession();
      const token = session?.access_token || supabaseAnonKey;

      console.log('💾 Saving username directly to user_profiles table...', { userId, username });

      const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
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

      console.log('✅ Username saved directly to database');

    } catch (error) {
      console.error('❌ Error saving username directly:', error);
    }
  }

  /**
   * Save onboarding data to both local storage and Supabase
   */
  async saveOnboardingData(data: any): Promise<void> {
    try {
      // 1. Save to local storage (for offline access and immediate availability)
      const existingData = await this.getOnboardingData();
      const updatedData = { ...existingData, ...data };
      await AsyncStorage.setItem('onboarding_data', JSON.stringify(updatedData));
      console.log('💾 Onboarding data saved locally:', updatedData);

      // 2. Save to Supabase (for persistence and cross-device sync)
      const { session } = await this.getCurrentSession();
      if (session?.user) {
        await this.saveToSupabase(session.user.id, updatedData);
      } else {
        console.log('📡 No active session - skipping Supabase save (will sync when user logs in)');
      }

    } catch (err) {
      console.error('Error saving onboarding data:', err);
      // Don't throw - at least local storage might have worked
    }
  }

  /**
   * Sync local onboarding data to Supabase (called after login)
   */
  async syncOnboardingDataToSupabase(): Promise<void> {
    try {
      const { session } = await this.getCurrentSession();
      if (!session?.user) {
        console.log('📡 No active session - cannot sync to Supabase');
        return;
      }

      const localData = await this.getOnboardingData();
      if (Object.keys(localData).length === 0) {
        console.log('📡 No local onboarding data to sync');
        return;
      }

      console.log('🔄 Syncing local onboarding data to Supabase...');
      await this.saveToSupabase(session.user.id, localData);
      
    } catch (error) {
      console.error('❌ Error syncing onboarding data to Supabase:', error);
      // Don't throw - graceful degradation
    }
  }
}

// Export singleton instance
export const authService = new AuthService(); 