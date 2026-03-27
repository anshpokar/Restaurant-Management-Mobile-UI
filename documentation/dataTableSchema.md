-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address_label text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  phone_number text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.customer_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT customer_otps_pkey PRIMARY KEY (id)
);
CREATE TABLE public.delivery_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  label text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  latitude numeric,
  longitude numeric,
  is_default boolean DEFAULT false,
  is_within_delivery_zone boolean DEFAULT true,
  distance_from_restaurant numeric,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT delivery_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.delivery_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT delivery_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.delivery_person_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_person_id uuid,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  accuracy numeric,
  speed numeric,
  bearing numeric,
  recorded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT delivery_person_locations_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_person_locations_delivery_person_id_fkey FOREIGN KEY (delivery_person_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.delivery_personnel (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  is_available boolean DEFAULT true,
  is_on_duty boolean DEFAULT false,
  current_order_id uuid,
  rating numeric DEFAULT 5.00,
  total_deliveries integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT delivery_personnel_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_personnel_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT delivery_personnel_current_order_id_fkey FOREIGN KEY (current_order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pincode text NOT NULL UNIQUE,
  city text NOT NULL,
  state text NOT NULL,
  is_active boolean DEFAULT true,
  max_distance_km numeric DEFAULT 20,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT delivery_zones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.dine_in_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL,
  user_id uuid NOT NULL,
  session_status text DEFAULT 'active'::text CHECK (session_status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])),
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'partial'::text])),
  payment_method text CHECK (payment_method = ANY (ARRAY['cod'::text, 'upi'::text, 'razorpay'::text])),
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at timestamp with time zone,
  payment_completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  session_name text,
  CONSTRAINT dine_in_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT dine_in_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id),
  CONSTRAINT dine_in_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  menu_item_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT favorites_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);
CREATE TABLE public.menu_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL,
  category text NOT NULL,
  veg boolean DEFAULT true,
  rating numeric DEFAULT 4.5,
  image text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_available boolean DEFAULT true,
  is_special boolean DEFAULT false,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  discount_code text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT offers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  menu_item_id bigint,
  name text NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  image text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  table_id uuid,
  status text DEFAULT 'placed'::text CHECK (status = ANY (ARRAY['placed'::text, 'preparing'::text, 'cooking'::text, 'prepared'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text])),
  total_amount numeric DEFAULT 0,
  delivery_person_id uuid,
  delivery_address text,
  is_paid boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  order_type text CHECK (order_type = ANY (ARRAY['dine_in'::text, 'delivery'::text])),
  placed_by text CHECK (placed_by = ANY (ARRAY['customer'::text, 'waiter'::text])),
  customer_name text,
  customer_email text,
  customer_phone text,
  delivery_address_line2 text,
  delivery_pincode text,
  delivery_latitude numeric,
  delivery_longitude numeric,
  delivery_instructions text,
  payment_method text CHECK (payment_method = ANY (ARRAY['cod'::text, 'upi'::text, 'razorpay'::text, 'cash'::text])),
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])),
  payment_id text,
  paid_at timestamp with time zone,
  delivery_status text DEFAULT 'pending'::text,
  assigned_at timestamp with time zone,
  picked_up_at timestamp with time zone,
  delivered_at timestamp with time zone,
  estimated_delivery_time timestamp with time zone,
  actual_delivery_time timestamp with time zone,
  distance_to_customer numeric,
  route_polyline text,
  razorpay_order_id text,
  razorpay_signature text,
  delivery_rating integer CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  delivery_feedback text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  notes text,
  session_name text,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id),
  CONSTRAINT orders_delivery_person_id_fkey FOREIGN KEY (delivery_person_id) REFERENCES auth.users(id)
);
CREATE TABLE public.otp_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  purpose text NOT NULL DEFAULT 'email_verification'::text,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT otp_verifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  email text,
  role text DEFAULT 'customer'::text CHECK (role = ANY (ARRAY['admin'::text, 'customer'::text, 'delivery'::text, 'waiter'::text, 'chef'::text])),
  username text UNIQUE,
  phone_number text,
  current_latitude numeric,
  current_longitude numeric,
  last_location_update timestamp with time zone,
  total_deliveries integer DEFAULT 0,
  rating numeric DEFAULT 5.00,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.restaurant_tables (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  table_number integer NOT NULL UNIQUE,
  capacity integer NOT NULL,
  status text DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'occupied'::text, 'reserved'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  occupied_at timestamp with time zone,
  occupied_by_customer_name text,
  occupied_by_customer_email text,
  current_order_id uuid,
  is_reserved boolean DEFAULT false,
  reservation_start_time time without time zone,
  reservation_end_time time without time zone,
  auto_release_at timestamp with time zone,
  CONSTRAINT restaurant_tables_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_tables_current_order_id_fkey FOREIGN KEY (current_order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  priority text DEFAULT 'normal'::text,
  admin_response text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.table_bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  table_id uuid,
  booking_date date NOT NULL,
  booking_time time without time zone NOT NULL,
  guests_count integer NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  special_requests text,
  phone_number text,
  occasion text,
  customer_name text,
  customer_email text,
  booking_duration integer DEFAULT 90,
  CONSTRAINT table_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT table_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT table_bookings_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id)
);
CREATE TABLE public.table_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  started_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at timestamp with time zone,
  total_orders integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'pending_partial'::text, 'completed'::text])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT table_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id)
);
CREATE TABLE public.upi_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  vpa text NOT NULL DEFAULT 'anshjpokar@oksbi'::text,
  amount numeric NOT NULL DEFAULT 0,
  upi_link text NOT NULL,
  transaction_id text,
  beneficiary_name text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'verification_requested'::text, 'verified'::text, 'failed'::text, 'expired'::text])),
  qr_expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  verified_by uuid,
  verification_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT upi_payments_pkey PRIMARY KEY (id),
  CONSTRAINT upi_payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id)
);