import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://haeckyztbfajwoytemzk.supabase.co";
const supabaseKey = "sb_publishable_NC367qfAnSGeDihVBIia9A_YnGifhTv";

export const supabase = createClient(supabaseUrl, supabaseKey);
