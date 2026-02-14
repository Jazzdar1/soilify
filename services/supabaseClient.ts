import { createClient } from '@supabase/supabase-js';

import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://usfmpmowiftpxrmrkxaj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZm1wbW93aWZ0cHhybXJreGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg4ODMsImV4cCI6MjA4NjM5NDg4M30.stwO54IH0EO8eq3ZPiIm5QEuV2QJk9dCKBq7UMGqj7c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to map DB column names to App types if needed
export const mapProductFromDB = (dbItem: any) => ({
  ...dbItem,
  stockCount: dbItem.stock_count,
  inStock: dbItem.in_stock
});

export const mapOrderFromDB = (dbItem: any) => ({
  ...dbItem,
  farmerName: dbItem.farmer_name,
  totalPrice: dbItem.total_price,
  paymentStatus: dbItem.payment_status,
  paymentMethod: dbItem.payment_method,
  product: dbItem.product_details,
  date: new Date(dbItem.created_at).toLocaleDateString()
});