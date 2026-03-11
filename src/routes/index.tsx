import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { SplashScreen } from '@/pages/auth/splash-screen';
import { OnboardingScreen } from '@/pages/auth/onboarding-screen';
import { LoginScreen } from '@/pages/auth/login-screen';
import { SignupScreen } from '@/pages/auth/signup-screen';
import { ForgotPasswordScreen } from '@/pages/auth/forgot-password-screen';

// Customer Screens
import { CustomerApp } from '@/pages/customer/customer-app';
import { HomeScreen } from '@/pages/customer/home-screen';
import { MenuScreen } from '@/pages/customer/menu-screen';
import { BookingsScreen } from '@/pages/customer/bookings-screen';
import { OrdersScreen } from '@/pages/customer/orders-screen';
import { ProfileScreen } from '@/pages/customer/profile-screen';
import { SavedAddressesScreen } from '@/pages/customer/saved-addresses-screen';
import { FavoritesScreen } from '@/pages/customer/favorites-screen';
import { NotificationsScreen } from '@/pages/customer/notifications-screen';
import { HelpSupportScreen } from '@/pages/customer/help-support-screen';

// Admin Screens
import { AdminApp } from '@/pages/admin/admin-app';
import { AdminDashboard } from '@/pages/admin/admin-dashboard';
import { AdminOrders } from '@/pages/admin/admin-orders';
import { AdminMenu } from '@/pages/admin/admin-menu';
import { AdminTables } from '@/pages/admin/admin-tables';
import { AdminReports } from '@/pages/admin/admin-reports';
import { AdminUserManagement } from '@/pages/admin/admin-user-management';

// Chef Screens
import { ChefApp } from '@/pages/chef/chef-app';
import { ChefDashboard } from '@/pages/chef/chef-dashboard';

// Waiter Screens
import { WaiterApp } from '@/pages/waiter/waiter-app';
import { WaiterDashboard } from '@/pages/waiter/waiter-dashboard';
import { WaiterOrdering } from '@/pages/waiter/waiter-ordering';

// Delivery Screens
import { DeliveryApp } from '@/pages/delivery/delivery-app';
import { DeliveryTasks } from '@/pages/delivery/tasks-screen';
import { DeliveryHistory } from '@/pages/delivery/history-screen';
import { DeliveryProfile } from '@/pages/delivery/profile-screen';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Profile, UserRole } from '@/lib/supabase';

interface AppRoutesProps {
    userRole: UserRole | null;
    userProfile: Profile | null;
    isLoadingAuth: boolean;
    handleLogout: () => void;
}

export function AppRoutes({ userRole, userProfile, isLoadingAuth, handleLogout }: AppRoutesProps) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Routes location={location}>
            {/* Public Routes */}
            <Route
                path="/"
                element={
                    userRole ?
                        <Navigate to={`/${userRole}`} replace /> :
                        <SplashScreen onTimeout={() => navigate('/onboarding')} />
                }
            />
            <Route path="/onboarding" element={<OnboardingScreen onComplete={() => navigate('/login')} />} />
            <Route
                path="/login"
                element={
                    userRole ?
                        <Navigate to={`/${userRole}`} replace /> :
                        <LoginScreen
                            onLogin={() => { }} // Handle via auth change listener
                            onSignup={() => navigate('/signup')}
                            onForgotPassword={() => navigate('/forgot-password')}
                        />
                }
            />
            <Route path="/signup" element={<SignupScreen onLogin={() => navigate('/login')} onSignupSuccess={() => { }} />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen onBack={() => navigate(-1)} onSuccess={() => navigate('/login')} />} />

            {/* Role Protected Routes */}

            {/* Customer Routes */}
            <Route path="/customer" element={
                <ProtectedRoute userRole={userRole} allowedRoles={['customer']} isLoading={isLoadingAuth}>
                    <CustomerApp onLogout={handleLogout} profile={userProfile} />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/customer/home" replace />} />
                <Route path="home" element={<HomeScreen />} />
                <Route path="menu" element={<MenuScreen />} />
                <Route path="bookings" element={<BookingsScreen />} />
                <Route path="orders" element={<OrdersScreen />} />
                <Route path="profile" element={<ProfileScreen />} />
                <Route path="addresses" element={<SavedAddressesScreen />} />
                <Route path="favorites" element={<FavoritesScreen />} />
                <Route path="notifications" element={<NotificationsScreen />} />
                <Route path="help-support" element={<HelpSupportScreen />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={
                <ProtectedRoute userRole={userRole} allowedRoles={['admin']} isLoading={isLoadingAuth}>
                    <AdminApp onLogout={handleLogout} />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="menu" element={<AdminMenu />} />
                <Route path="tables" element={<AdminTables />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="users" element={<AdminUserManagement />} />
            </Route>

            {/* Waiter Routes */}
            <Route path="/waiter" element={
                <ProtectedRoute userRole={userRole} allowedRoles={['waiter']} isLoading={isLoadingAuth}>
                    <WaiterApp onLogout={handleLogout} profile={userProfile} />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/waiter/dashboard" replace />} />
                <Route path="dashboard" element={<WaiterDashboard />} />
                <Route path="ordering/:tableId" element={<WaiterOrdering />} />
            </Route>

            {/* Chef Routes */}
            <Route path="/chef" element={
                <ProtectedRoute userRole={userRole} allowedRoles={['chef']} isLoading={isLoadingAuth}>
                    <ChefApp onLogout={handleLogout} profile={userProfile} />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/chef/dashboard" replace />} />
                <Route path="dashboard" element={<ChefDashboard />} />
            </Route>

            {/* Delivery Routes */}
            <Route path="/delivery" element={
                <ProtectedRoute userRole={userRole} allowedRoles={['delivery']} isLoading={isLoadingAuth}>
                    <DeliveryApp onLogout={handleLogout} />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/delivery/tasks" replace />} />
                <Route path="tasks" element={<DeliveryTasks />} />
                <Route path="history" element={<DeliveryHistory />} />
                <Route path="profile" element={<DeliveryProfile />} />
            </Route>

            {/* 404 / Default */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
