import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { type UserRole } from '@/lib/supabase';

interface ProtectedRouteProps {
    children: React.ReactNode;
    userRole: UserRole | null;
    allowedRoles?: UserRole[];
    isLoading?: boolean;
}

export function ProtectedRoute({
    children,
    userRole,
    allowedRoles,
    isLoading = false
}: ProtectedRouteProps) {
    const location = useLocation();

    if (isLoading) {
        return null; // Or a loading spinner
    }

    if (!userRole) {
        // Redirect to login but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        // Redirect to their default dashboard if they try to access a page they aren't allowed to
        return <Navigate to={`/${userRole}`} replace />;
    }

    return <>{children}</>;
}
