import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, type UserRole, type Profile } from '@/lib/supabase';

export function useAuth() {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Initial State Hydration from localStorage
    const [userRole, setUserRole] = useState<UserRole | null>(() => {
        const stored = localStorage.getItem('userProfile');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Simple freshness check (24h)
                if (parsed.timestamp && Date.now() - parsed.timestamp < 86400000) {
                    return parsed.role;
                }
            } catch (e) {}
        }
        return null;
    });

    const [userProfile, setUserProfile] = useState<Profile | null>(() => {
        const stored = localStorage.getItem('userProfile');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.timestamp && Date.now() - parsed.timestamp < 86400000) {
                    return parsed as Profile;
                }
            } catch (e) {}
        }
        return null;
    });

    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchAndSetProfile = async (userId: string, email?: string, fullName?: string) => {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error || !profile) {
                    console.log("No profile found, creating default for:", userId);
                    // Create default profile for social login users
                    const { data: newProfile, error: createError } = await supabase
                        .from('profiles')
                        .insert([{
                            id: userId,
                            email: email || '',
                            full_name: fullName || 'Google User',
                            username: `user_${userId.slice(0, 5)}`,
                            role: 'customer',
                            phone_number: ''
                        }])
                        .select()
                        .single();

                    if (!createError && newProfile) {
                        if (isMounted) {
                            setUserRole(newProfile.role);
                            setUserProfile(newProfile);
                        }
                        return newProfile;
                    }
                } else {
                    if (isMounted) {
                        setUserRole(profile.role);
                        setUserProfile(profile);
                    }
                    return profile;
                }
            } catch (err) {
                console.error("Error in fetchAndSetProfile:", err);
            }
            return null;
        };

        const initializeAuth = async () => {
            try {
                // Add timeout to prevent infinite loading
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Auth timeout')), 10000)
                );
                
                const authPromise = supabase.auth.getSession();
                const { data: { session } } = await Promise.race([authPromise, timeoutPromise]) as any;

                if (session?.user) {
                    const profile = await fetchAndSetProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.full_name
                    );

                    if (profile && isMounted) {
                        // Store user data in localStorage for reuse
                        const userData = {
                            id: profile.id,
                            email: profile.email,
                            full_name: profile.full_name,
                            username: profile.username,
                            phone_number: profile.phone_number,
                            role: profile.role,
                            timestamp: Date.now() // Add timestamp for freshness check
                        };
                        localStorage.setItem('userProfile', JSON.stringify(userData));
                                        
                        // If on auth pages, redirect to dashboard
                        if (['/login', '/signup', '/forgot-password', '/'].includes(location.pathname)) {
                            navigate(`/${profile.role}`, { replace: true });
                        }
                    }
                } else {
                    // No session found by Supabase
                    console.log('No active Supabase session found');
                    // We DO NOT clear localStorage here anymore, 
                    // unless we are sure it's invalid (handled by SIGNE_OUT event)
                }
            } catch (err: any) {
                // Only clear on confirmed auth failure, not generic timeout
                if (err.message !== 'Auth timeout') {
                    console.error("Auth init error:", err);
                } else {
                    console.warn('Auth initialization timed out, using fallback cache');
                }
            } finally {
                if (isMounted) {
                    setIsLoadingAuth(false);
                }
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth event:", event);

            if (event === 'SIGNED_IN' && session?.user) {
                console.log("User signed in, fetching profile...");
                const profile = await fetchAndSetProfile(
                    session.user.id,
                    session.user.email,
                    session.user.user_metadata?.full_name
                );

                if (profile && isMounted) {
                    console.log("Profile resolved, navigating to:", profile.role);
                    // Store user data in localStorage for reuse
                    const userData = {
                        id: profile.id,
                        email: profile.email,
                        full_name: profile.full_name,
                        username: profile.username,
                        phone_number: profile.phone_number,
                        role: profile.role,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('userProfile', JSON.stringify(userData));
                    
                    // Only navigate if we are on an auth page
                    if (['/login', '/signup', '/forgot-password', '/'].includes(location.pathname)) {
                        navigate(`/${profile.role}`, { replace: true });
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                console.log("User signed out, clearing state.");
                setUserRole(null);
                setUserProfile(null);
                localStorage.removeItem('userProfile'); // Clear stored profile
                if (!['/login', '/signup', '/forgot-password'].includes(location.pathname)) {
                    navigate('/login', { replace: true });
                }
            } else if (event === 'INITIAL_SESSION' && session?.user) {
                console.log("Initial session detected.");
                // Profile is handled by initializeAuth()
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
        // Dependency array: only internal stable vars
    }, [navigate]);

    // 2. Separate Redirection Logic (triggered when profile is loaded AND we are on auth pages)
    useEffect(() => {
        if (!isLoadingAuth && userProfile && ['/login', '/signup', '/forgot-password', '/'].includes(location.pathname)) {
            navigate(`/${userProfile.role}`, { replace: true });
        }
    }, [isLoadingAuth, userProfile, location.pathname, navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return {
        userRole,
        userProfile,
        isLoadingAuth,
        handleLogout
    };
}
