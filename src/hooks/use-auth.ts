import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, type UserRole, type Profile } from '@/lib/supabase';

export function useAuth() {
    const navigate = useNavigate();
    const location = useLocation();
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    useEffect(() => {
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
                        setUserRole(newProfile.role);
                        setUserProfile(newProfile);
                        return newProfile;
                    }
                } else {
                    setUserRole(profile.role);
                    setUserProfile(profile);
                    return profile;
                }
            } catch (err) {
                console.error("Error in fetchAndSetProfile:", err);
            }
            return null;
        };

        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const profile = await fetchAndSetProfile(
                        session.user.id,
                        session.user.email,
                        session.user.user_metadata?.full_name
                    );

                    if (profile) {
                        // If on auth pages, redirect to dashboard
                        if (['/login', '/signup', '/forgot-password', '/'].includes(location.pathname)) {
                            navigate(`/${profile.role}`, { replace: true });
                        }
                    }
                }
            } catch (err) {
                console.error("Auth init error:", err);
            } finally {
                setIsLoadingAuth(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth event:", event);
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
                const profile = await fetchAndSetProfile(
                    session.user.id,
                    session.user.email,
                    session.user.user_metadata?.full_name
                );

                if (profile) {
                    navigate(`/${profile.role}`, { replace: true });
                }
            } else if (event === 'SIGNED_OUT') {
                setUserRole(null);
                setUserProfile(null);
                navigate('/login', { replace: true });
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate, location.pathname]);

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
