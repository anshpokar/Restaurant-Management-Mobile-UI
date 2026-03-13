import { createClient } from '@supabase/supabase-js';

/**
 * =====================================================
 * SUPABASE CLIENT & TYPE DEFINITIONS
 * =====================================================
 * 
 * Database Tables Covered:
 * 1. profiles - User accounts and authentication
 * 2. menu_items - Restaurant menu items
 * 3. restaurant_tables - Dine-in table management
 * 4. orders - Customer orders
 * 5. order_items - Order line items
 * 6. table_bookings - Table reservations
 * 7. offers - Promotional offers
 * 8. addresses - Customer saved delivery addresses
 * 9. favorites - Customer favorite menu items
 * 10. notifications - User notifications
 * 11. support_tickets - Help & support tickets
 * 12. upi_payments - UPI QR payment tracking (NEW)
 * 13. delivery_person_locations - Delivery tracking (NEW)
 * 14. delivery_config - Delivery configuration (NEW)
 * 
 * All interfaces are typed to match Supabase schema exactly.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('--- SUPABASE CONFIG DEBUG ---');
console.log('Available Env Keys:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
console.log('URL:', supabaseUrl);
console.log('URL Valid:', supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseUrl.startsWith('https://'));
console.log('Key length:', supabaseAnonKey?.length || 0);
console.log('Key Valid:', supabaseAnonKey && supabaseAnonKey.length > 50); // Supabase keys are typically long
console.log('-----------------------------');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  const errorMsg = 'CRITICAL: Supabase environment variables are missing or invalid! ' + 
                   'Please check your .env file and RESTART your terminal (npm run dev).';
  console.error(errorMsg);
  // Only alert in browser to avoid blocking build/test
  if (typeof window !== 'undefined') {
    alert(errorMsg);
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid-url.supabase.co', 
  supabaseAnonKey || 'invalid-key'
);

export type UserRole = 'admin' | 'customer' | 'delivery' | 'waiter' | 'chef';

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  phone_number: string;
  role: UserRole;
  email: string;
}

export interface RestaurantTable {
  id: string;
  table_number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  veg: boolean;
  rating: number;
  image: string;
  is_available: boolean;
  is_special?: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount_code: string;
  is_active: boolean;
  created_at: string;
}

export interface TableBooking {
  id: string;
  user_id: string;
  table_id: string;
  booking_date: string;
  booking_time: string;
  guests_count: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  // Join data
  restaurant_tables?: RestaurantTable;
}

export interface Order {
  id: string;
  user_id?: string; // Optional for walk-in dine-in
  table_id?: string; // Link to restaurant_tables
  status: 'placed' | 'preparing' | 'cooking' | 'prepared' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total_amount: number;
  delivery_person_id?: string;
  delivery_address?: string;
  is_paid: boolean;
  created_at: string;
  // Join data
  profiles?: Profile;
  delivery_person?: Profile;
  order_items?: OrderItem[];
  restaurant_tables?: RestaurantTable;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

// Additional interfaces for complete database integration
export interface Address {
  id: string;
  user_id: string;
  address_label: string; // e.g., "Home", "Work"
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone_number: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Input type for creating an address (without user_id)
export interface AddressInput {
  address_label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone_number: string;
  is_default: boolean;
}

export interface Favorite {
  id: string;
  user_id: string;
  menu_item_id: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'booking' | 'promotion' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  admin_response?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

// UPI Payment interfaces
export interface Upayment {
  id: string;
  order_id: string;
  qr_id: string;
  amount: number;
  upi_link: string;
  transaction_id?: string; // UTR number submitted by customer
  status: 'pending' | 'verified' | 'failed' | 'expired';
  expires_at: string;
  verified_at?: string;
  verified_by?: string; // Admin ID who verified
  notes?: string; // Admin verification notes
  created_at: string;
  updated_at: string;
  // Join data
  orders?: Order;
  profiles?: Profile; // Verified by admin
}

// Delivery configuration
export interface DeliveryConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
  is_active: boolean;
  updated_at: string;
}

// Delivery person location tracking
export interface DeliveryPersonLocation {
  id: string;
  delivery_person_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  recorded_at: string;
  // Join data
  profiles?: Profile;
}

// Cart item (temporary, not stored in database)
export interface CartItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
  veg: boolean;
}

// Booking input type
export interface TableBookingInput {
  table_id: string;
  booking_date: string;
  booking_time: string;
  guests_count: number;
}

// Order input type
export interface OrderInput {
  table_id?: string;
  items: {
    menu_item_id: number;
    quantity: number;
  }[];
  total_amount: number;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_pincode?: string;
}

// Helper function to get stored user data from localStorage
export function getStoredUser() {
  const stored = localStorage.getItem('userProfile');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing stored user profile:', e);
      return null;
    }
  }
  return null;
}

/**
 * =====================================================
 * CACHE MANAGEMENT UTILITIES
 * Automatic stale cache detection and recovery
 * =====================================================
 */

interface CachedUser {
  id: string;
  email: string;
  full_name: string;
  username: string;
  phone_number: string;
  role: string;
  timestamp: number;
}

/**
 * Check if cached user profile is stale (older than 24 hours)
 */
export function isStaleCache(timestamp?: number): boolean {
  if (!timestamp) return true;
  const age = Date.now() - timestamp;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 86400000ms
  return age > TWENTY_FOUR_HOURS;
}

/**
 * Safely get stored user with validation
 * Returns null if cache is stale or invalid
 */
export function getValidStoredUser(): CachedUser | null {
  try {
    const stored = localStorage.getItem('userProfile');
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as CachedUser;
    
    // Validate required fields
    if (!parsed.id || !parsed.email || !parsed.role) {
      console.warn('🗑️ Invalid cached user data, clearing');
      localStorage.removeItem('userProfile');
      return null;
    }
    
    // Check if stale (>24 hours old)
    if (isStaleCache(parsed.timestamp)) {
      console.log('🕰️ Cache is stale (>24h), clearing');
      localStorage.removeItem('userProfile');
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Error parsing cached user:', error);
    localStorage.removeItem('userProfile');
    return null;
  }
}

/**
 * Clear ALL application cache safely
 * Preserves only essential non-app data
 */
export function clearApplicationCache() {
  console.group('🗑️ Clearing Application Cache');
  
  try {
    // Clear localStorage app keys
    const appKeys = [
      'userProfile',
      'cart',
      'activeSession',
      'checkoutData',
      'selectedAddress',
      'favorites'
    ];
    
    appKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`  ✓ Cleared: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage completely (temporary data)
    const sessionCount = sessionStorage.length;
    sessionStorage.clear();
    console.log(`  ✓ Cleared ${sessionCount} sessionStorage items`);
    
    console.log('✅ Cache cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  } finally {
    console.groupEnd();
  }
}

/**
 * Attempt to recover from connection errors
 * Returns true if recovery was successful
 */
export async function attemptRecovery(maxRetries = 3): Promise<boolean> {
  console.group('🔄 Attempting Connection Recovery');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Test connection with simple query
      const { error } = await supabase.from('profiles').select('count').limit(1);
      
      if (!error) {
        console.log('✅ Connection recovered!');
        console.groupEnd();
        return true;
      }
      
      console.warn(`⚠️ Attempt ${attempt} failed:`, error?.message);
      
    } catch (error: any) {
      console.warn(`⚠️ Attempt ${attempt} error:`, error.message);
      
      // If all retries exhausted, clear cache
      if (attempt === maxRetries) {
        console.warn('⚠️ All retries failed, clearing stale cache');
        clearApplicationCache();
      }
    }
  }
  
  console.groupEnd();
  return false;
}

/**
 * Smart logout - clears everything and redirects
 */
export async function smartLogout(navigate?: (path: string, options?: { replace: boolean }) => void) {
  console.log('🚪 Smart logout initiated');
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('⚠️ Error signing out, continuing with cache clear:', error);
  }
  
  // Clear all cache
  clearApplicationCache();
  
  // Redirect to login
  if (navigate) {
    navigate('/login', { replace: true });
  } else if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
