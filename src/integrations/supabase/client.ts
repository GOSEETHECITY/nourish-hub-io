import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yaicfjdquvfifwtfpmbm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWNmamRxdXZmaWZ3dGZwbWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE0NjksImV4cCI6MjA4NzkxNzQ2OX0.UXqIl_oCqguuaEi-WEVkEJXJ1QDCDoEVQ5FmPqifhTw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
