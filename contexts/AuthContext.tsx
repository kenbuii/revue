import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/auth-js';
import { supabaseAuth } from '@/lib/supabase';
import { authService, AuthState } from '@/lib/auth';

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  hasCompletedOnboarding: () => Promise<boolean>;
  completeOnboarding: () => Promise<{ success: boolean; error?: string }>;
  saveOnboardingData: (data: any) => Promise<void>;
  getOnboardingData: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Test connection first
        const connectionTest = await authService.testConnection();
        if (!connectionTest.success) {
          console.error('Failed to connect to Supabase:', connectionTest.error);
        }

        // Get initial session
        const { session } = await authService.getCurrentSession();
        
        if (mounted) {
          setAuthState({
            session,
            user: session?.user ?? null,
            loading: false,
            isAuthenticated: !!session,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthState({
            session: null,
            user: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabaseAuth.onAuthStateChange(
      async (event: any, session: Session | null) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        
        if (mounted) {
          setAuthState({
            session,
            user: session?.user ?? null,
            loading: false,
            isAuthenticated: !!session,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign up wrapper
  const signUp = async (email: string, password: string, username?: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      const result = await authService.signUp({ email, password, username });
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Sign in wrapper
  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      const result = await authService.signIn({ email, password });
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Sign out wrapper
  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      const result = await authService.signOut();
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Test connection wrapper
  const testConnection = async () => {
    return await authService.testConnection();
  };

  // Onboarding helpers
  const hasCompletedOnboarding = async () => {
    return await authService.hasCompletedOnboarding();
  };

  const completeOnboarding = async () => {
    return await authService.completeOnboarding();
  };

  const saveOnboardingData = async (data: any) => {
    return await authService.saveOnboardingData(data);
  };

  const getOnboardingData = async () => {
    return await authService.getOnboardingData();
  };

  const contextValue: AuthContextType = {
    ...authState,
    signUp,
    signIn,
    signOut,
    testConnection,
    hasCompletedOnboarding,
    completeOnboarding,
    saveOnboardingData,
    getOnboardingData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 