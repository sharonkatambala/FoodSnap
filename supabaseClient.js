import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"
import { CONFIG } from "./config.js";

// Connect to Supabase
const supabaseUrl = CONFIG.supabase.url;
const supabaseKey = CONFIG.supabase.anonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
