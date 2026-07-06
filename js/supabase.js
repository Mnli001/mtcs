// js/supabase.js
// Supabase Client Initialization for MTCS Pro

// Your Supabase Project Credentials:
const SUPABASE_URL = 'https://ocxikzmdcuzzhccilfiu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_794xS-TdjqAEvq9Yk0CZBQ_KxUHexTN';

window.supabaseClient = null;

if (window.supabase && window.supabase.createClient) {
    try {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client амжилттай холбогдлоо.");
    } catch (e) {
        console.warn("Supabase холболтын алдаа:", e);
    }
} else {
    console.warn("Supabase JS сан ачаалагдаагүй байна. Local/Mock горимд ажиллана.");
}
