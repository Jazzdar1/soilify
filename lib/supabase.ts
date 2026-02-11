// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ⚠️ REPLACE THESE WITH YOUR REAL SUPABASE KEYS
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://usfmpmowiftpxrmrkxaj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZm1wbW93aWZ0cHhybXJreGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg4ODMsImV4cCI6MjA4NjM5NDg4M30.stwO54IH0EO8eq3ZPiIm5QEuV2QJk9dCKBq7UMGqj7c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to block known temp mails
export const isTempMail = (email: string) => {
  const tempDomains = ['yopmail.com', 'temp-mail.org', 'mailinator.com', '10minutemail.com'];
  const domain = email.split('@')[1];
  return tempDomains.includes(domain);
};