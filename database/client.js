import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

const supabaseKey = config.supabase.serviceKey || config.supabase.key;

export const supabase = createClient(
  config.supabase.url,
  supabaseKey
);
