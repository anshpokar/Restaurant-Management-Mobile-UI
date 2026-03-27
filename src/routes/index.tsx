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
import { PaymentScreen } from '@/pages/customer/upi-payment-screen';
import { CheckoutScreen } from '@/pages/customer/checkout-screen';
import { PaymentHistoryScreen } from '@/pages/customer/payment-history-screen';
import { SessionHistoryScreen } from '@/pages/customer/session-history-screen';
import { OrderTrackingScreen } from '@/pages/customer/order-tracking-screen';

// Admin Screens
import { AdminApp } from '@/pages/admin/admin-app';
import { AdminDashboard } from '@/pages/admin/admin-dashboard';
import { AdminOrders } from '@/pages/admin/admin-orders';
import { AdminMenu } from '@/pages/admin/admin-menu';
import { AdminTables } from '@/pages/admin/admin-tables';
import { AdminReports } from '@/pages/admin/admin-reports';
import { AdminUserManagement } from '@/pages/admin/admin-user-management';
import { AdminBookingsScreen } from '@/pages/admin/admin-bookings-screen';
import { DeliveryAssignmentScreen } from '@/pages/admin/delivery-assignment-screen';
import { AdminPaymentVerificationScreen } from '@/pages/admin/payment-verification-screen';
import { AdminTableReservationsScreen } from '@/pages/admin/admin-table-reservations-screen';
import { AdminSettlementScreen } from '@/pages/admin/admin-settlement-screen';

// Chef Screens
import { ChefApp } from '@/pages/chef/chef-app';
import { ChefDashboardScreen } from '@/pages/chef/chef-dashboard';

// Waiter Screens
import { WaiterApp } from '@/pages/waiter/waiter-app';
import { WaiterDashboard } from '@/pages/waiter/waiter-dashboard';
import { WaiterOrdering } from '@/pages/waiter/waiter-ordering';
import { WaiterTableSelectionScreen } from '@/pages/waiter/table-selection-screen';
import { WaiterTakeOrderScreen } from '@/pages/waiter/take-order-screen';
import { WaiterCustomerSelectionScreen } from '@/pages/waiter/customer-selection-screen';
import { WaiterOTPVerificationScreen } from '@/pages/waiter/otp-verification-screen';
import { WaiterCustomerSignupScreen } from '@/pages/waiter/customer-signup-screen';
import { WaiterSessionStartScreen } from '@/pages/waiter/session-start-screen';
import { WaiterSessionManagementScreen } from '@/pages/waiter/session-management-screen';

// Delivery Screens
import { DeliveryApp } from '@/pages/delivery/delivery-app';
import { DeliveryTasksScreen } from '@/pages/delivery/tasks-screen';
import { DeliveryHistory } from '@/pages/delivery/history-screen';
import { DeliveryProfile } from '@/pages/delivery/profile-screen';
import { AddressPickerScreen } from '@/pages/delivery/address-picker-screen';
import { LeafletAddressPicker } from '@/pages/delivery/leaflet-address-picker';

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
                <Route path="checkout" element={<CheckoutScreen />} />
                <Route path="profile" element={<ProfileScreen />} />
                <Route path="addresses" element={<SavedAddressesScreen />} />
                <Route path="delivery-address" element={<AddressPickerScreen />} />
                <Route path="delivery-address-map" element={<LeafletAddressPicker />} /> {/* ✅ FREE Leaflet */}
                <Route path="favorites" element={<FavoritesScreen />} />
                <Route path="notifications" element={<NotificationsScreen />} />
                <Route path="help-support" element={<HelpSupportScreen />} />
                <Route path="payment/:orderId" element={<PaymentScreen />} />
                <Route path="payment/session/:sessionId" element={<PaymentScreen />} />
                <Route path="payment-history" element={<PaymentHistoryScreen />} />
                <Route path="session-history" element={<SessionHistoryScreen />} />
                <Route path="tracking/:orderId" element={<OrderTrackingScreen />} />
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
                <Route path="bookings" element={<AdminBookingsScreen />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="users" element={<AdminUserManagement />} />
                <Route path="delivery-assignment" element={<DeliveryAssignmentScreen />} />
                <Route path="payment-verification" element={<AdminPaymentVerificationScreen />} />
                <Route path="table-reservations" element={<AdminTableReservationsScreen />} />
                <Route path="settlements" element={<AdminSettlementScreen />} />
            </Route>

            {/* Waiter Routes */}
            <Route path="/waiter" element={
                <ProtectedRoute userRole={userRole} allowedRoles={['waiter', 'admin']} isLoading={isLoadingAuth}>
                    <WaiterApp onLogout={handleLogout} profile={userProfile} />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/waiter/dashboard" replace />} />
                <Route path="dashboard" element={<WaiterDashboard />} />
                <Route path="tables" element={<WaiterTableSelectionScreen />} />
                
                {/* Legacy route - redirect to dashboard */}
                <Route path="customer-info/:tableId" element={<WaiterCustomerSelectionScreen />} />
                
                {/* New customer selection flow */}
                <Route path="customer-info/:tableId" element={<WaiterCustomerSelectionScreen />} />
                <Route path="otp-verify/:tableId" element={<WaiterOTPVerificationScreen />} />
                <Route path="signup/:tableId" element={<WaiterCustomerSignupScreen />} />
                
                {/* Session management flow */}
                <Route path="session/start/:tableId" element={<WaiterSessionStartScreen />} />
                <Route path="session/:sessionId" element={<WaiterSessionManagementScreen />} />
                <Route path="take-order/:tableId" element={<WaiterTakeOrderScreen />} />
                <Route path="ordering/:tableId" element={<WaiterOrdering />} />
            </Route>

            {/* Chef Routes */}
            <Route path="/chef" element={
                <ProtectedRoute userRole={userRole} allowedRoles={['chef']} isLoading={isLoadingAuth}>
                    <ChefApp onLogout={handleLogout} profile={userProfile} />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/chef/dashboard" replace />} />
                <Route path="dashboard" element={<ChefDashboardScreen />} />
            </Route>

            {/* Delivery Routes */}
            <Route path="/delivery" element={
                <ProtectedRoute userRole={userRole} allowedRoles={['delivery']} isLoading={isLoadingAuth}>
                    <DeliveryApp onLogout={handleLogout} profile={userProfile} />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/delivery/tasks" replace />} />
                <Route path="tasks" element={<DeliveryTasksScreen />} />
                <Route path="history" element={<DeliveryHistory />} />
                <Route path="profile" element={<DeliveryProfile />} />
            </Route>

            {/* 404 / Default */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}


