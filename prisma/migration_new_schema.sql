-- ============================================================
-- MIGRATION: Drop old schema, create new schema
-- Jalankan di Supabase SQL Editor
-- PERINGATAN: Script ini akan menghapus semua tabel lama!
-- ============================================================

-- 1. Drop tabel lama (cascade)
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS custom_product_responses CASCADE;
DROP TABLE IF EXISTS custom_product_requests CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS user_addresses CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS promos CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Buat tabel baru sesuai schema-revisi.sql

CREATE TABLE public.users (
  id bigserial PRIMARY KEY,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  email_verified_at timestamp without time zone,
  password character varying,
  remember_token character varying,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  role character varying NOT NULL DEFAULT 'customer',
  is_active boolean NOT NULL DEFAULT true,
  phone character varying,
  last_login_at timestamp with time zone,
  deleted_at timestamp with time zone,
  auth_user_id uuid UNIQUE
);

CREATE TABLE public.categories (
  id bigserial PRIMARY KEY,
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  description text,
  icon character varying,
  background_color character varying,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone
);

CREATE TABLE public.products (
  id bigserial PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES public.categories(id),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  short_description character varying,
  description text NOT NULL,
  price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  availability_type character varying NOT NULL DEFAULT 'ready_stock',
  preorder_duration character varying,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone
);

CREATE TABLE public.product_images (
  id bigserial PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES public.products(id),
  path character varying NOT NULL,
  alt_text character varying,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  mime_type character varying,
  file_size bigint,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.addresses (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.users(id),
  label character varying,
  recipient_name character varying NOT NULL,
  phone character varying NOT NULL,
  province character varying NOT NULL,
  city character varying NOT NULL,
  district character varying NOT NULL,
  postal_code character varying NOT NULL,
  address_line text NOT NULL,
  notes text,
  latitude numeric,
  longitude numeric,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.carts (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES public.users(id),
  guest_token uuid UNIQUE,
  status character varying NOT NULL DEFAULT 'active',
  expires_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.cart_items (
  id bigserial PRIMARY KEY,
  cart_id bigint NOT NULL REFERENCES public.carts(id),
  product_id bigint NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.orders (
  id bigserial PRIMARY KEY,
  order_number character varying NOT NULL UNIQUE,
  user_id bigint REFERENCES public.users(id),
  address_id bigint REFERENCES public.addresses(id),
  customer_name character varying NOT NULL,
  customer_email character varying NOT NULL,
  customer_phone character varying NOT NULL,
  shipping_address jsonb NOT NULL,
  status character varying NOT NULL DEFAULT 'pending',
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  customer_notes text,
  admin_notes text,
  placed_at timestamp with time zone,
  paid_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES public.orders(id),
  product_id bigint REFERENCES public.products(id),
  product_name character varying NOT NULL,
  product_slug character varying NOT NULL,
  product_image character varying,
  price numeric NOT NULL,
  quantity integer NOT NULL,
  subtotal numeric NOT NULL,
  availability_type character varying NOT NULL,
  preorder_duration character varying,
  customization jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.payments (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES public.orders(id),
  provider character varying,
  method character varying NOT NULL,
  external_reference character varying,
  amount numeric NOT NULL,
  status character varying NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  payload jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.shipments (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL UNIQUE REFERENCES public.orders(id),
  courier character varying,
  service character varying,
  tracking_number character varying,
  status character varying NOT NULL DEFAULT 'pending',
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE public.inventory_movements (
  id bigserial PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES public.products(id),
  user_id bigint REFERENCES public.users(id),
  type character varying NOT NULL,
  quantity_change integer NOT NULL,
  stock_before integer NOT NULL,
  stock_after integer NOT NULL,
  reference_type character varying,
  reference_id bigint,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.site_settings (
  id bigint PRIMARY KEY DEFAULT 1,
  brand_name character varying NOT NULL,
  tagline character varying,
  logo_path character varying,
  hero_badge character varying,
  hero_heading character varying NOT NULL,
  hero_highlight character varying,
  hero_description text NOT NULL,
  hero_image_path character varying,
  promotion_title character varying,
  promotion_description text,
  instagram_url character varying,
  whatsapp_number character varying,
  contact_email character varying,
  footer_text text,
  updated_by bigint REFERENCES public.users(id),
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

-- Seed data awal untuk site_settings
INSERT INTO public.site_settings (id, brand_name, hero_heading, hero_description)
VALUES (1, 'Arajut', 'Rajutan Berkualitas untuk Semua', 'Temukan koleksi rajutan premium kami')
ON CONFLICT (id) DO NOTHING;
