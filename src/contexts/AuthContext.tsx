import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: 'admin' | 'student') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔄 Fetching profile for user:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
      });

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error fetching profile:', error);
        
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          console.log('📝 Profile not found, creating default profile...');
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const newProfile = {
              id: userId,
              email: userData.user.email || '',
              full_name: userData.user.user_metadata?.full_name || null,
              role: 'student' as const
            };

            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single();

            if (createError) {
              console.error('❌ Error creating profile:', createError);
              return null;
            }

            console.log('✅ Profile created successfully:', createdProfile.role);
            return createdProfile;
          }
        }
        return null;
      }

      console.log('✅ Profile fetched successfully:', data.role);
      return data;
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      if (initialized) return; // Prevent multiple initializations
      
      try {
        console.log('🔄 Initializing auth...');
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted && !initialized) {
            console.log('⚠️ Auth initialization timeout, setting loading to false');
            setLoading(false);
            setInitialized(true);
          }
        }, 8000); // Increased timeout

        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('❌ Error getting session:', error);
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false);
          setInitialized(true);
          return;
        }

        if (currentSession?.user) {
          console.log('✅ Found existing session for user:', currentSession.user.id);
          setSession(currentSession);
          setUser(currentSession.user);
          
          try {
            const userProfile = await fetchUserProfile(currentSession.user.id);
            if (mounted) {
              setProfile(userProfile);
            }
          } catch (profileError) {
            console.error('❌ Error fetching profile during init:', profileError);
            if (mounted) {
              setProfile(null);
            }
          }
        } else {
          console.log('ℹ️ No existing session found');
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    const handleAuthStateChange = async (event: string, newSession: Session | null) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state change:', event, newSession?.user?.id || 'no user');
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user && event !== 'TOKEN_REFRESHED') {
        try {
          const userProfile = await fetchUserProfile(newSession.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        } catch (error) {
          console.error('❌ Error fetching profile in auth change:', error);
          if (mounted) {
            setProfile(null);
          }
        }
      } else if (!newSession?.user) {
        setProfile(null);
      }
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Then initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []); // Remove initialized from dependency array

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔄 Starting sign in process...');
      
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.error('❌ Supabase environment variables not configured');
        return { error: new Error('Database connection not configured. Please check environment variables.') };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error.message);
        
        // Handle specific error types
        if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          return { error: new Error('Unable to connect to the database. Please check your internet connection and try again.') };
        }
        
        return { error };
      }
      
      if (!data.user || !data.session) {
        console.error('❌ No user or session returned');
        return { error: new Error('Authentication failed') };
      }
      
      console.log('✅ Sign in successful for user:', data.user.id);
      return { error: null };
      
    } catch (error) {
      console.error('❌ Unexpected sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'admin' | 'student') => {
    try {
      console.log('🔄 Starting sign up process...');
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        // Create profile
        const profileData = {
          id: data.user.id,
          email: email.trim(),
          full_name: fullName,
          role,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (profileError) {
          console.error('❌ Error creating profile:', profileError);
          return { error: profileError };
        }
        
        console.log('✅ Sign up successful');
      }

      return { error: null };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🔄 Starting sign out process...');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Sign out successful');
      }
      
      // Clear state immediately
      setUser(null);
      setProfile(null);
      setSession(null);
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isStudent = profile?.role === 'student';

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isStudent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}