import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iumcvlwheadkrcxkaymi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bWN2bHdoZWFka3JjeGtheW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODQzMTQsImV4cCI6MjA4ODU2MDMxNH0.NZxpqsm-GHn5mZXHXzNsHRScjkaiqnAvZmEwgQeCRFY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
