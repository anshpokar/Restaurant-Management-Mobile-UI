import { createClient } from '@supabase/supabase-js';

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
