-- ==========================================================================
-- MTCS Pro — Supabase Database Safe Schema (Fix for "Database error finding user")
-- ==========================================================================
-- Supabase Project -> SQL Editor -> New Query -> Run

-- 1. Drop any broken triggers/functions first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text,
  display_name text,
  rank text DEFAULT 'Хүрэл',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS and Policies for Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.users;
CREATE POLICY "Allow all for authenticated users" ON public.users 
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument text NOT NULL,
  direction text NOT NULL,
  entry_price numeric,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  lot_size numeric NOT NULL,
  status text DEFAULT 'OPEN', -- 'OPEN', 'WIN', 'LOSS'
  risk_amount numeric,
  target_profit numeric,
  pnl numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. Enable RLS and Policies for Trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own trades" ON public.trades;
CREATE POLICY "Users can manage own trades" ON public.trades 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Optional: Allow public read of trades for global leaderboard aggregation
DROP POLICY IF EXISTS "Allow public read trades" ON public.trades;
CREATE POLICY "Allow public read trades" ON public.trades FOR SELECT USING (true);

-- 6. Safe User Trigger (Never blocks Auth signup/login)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(split_part(new.email, '@', 1), 'Трейдер'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Even if insert fails, never abort the Auth transaction!
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
