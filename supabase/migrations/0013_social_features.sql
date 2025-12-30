-- Phase 7: Personalization Tables

-- 1. Bookmarks (Want to Go)
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, restaurant_id)
);

-- 2. Visits (Went)
CREATE TABLE IF NOT EXISTS visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, restaurant_id) -- Simple visited flag for now
);

-- RLS Policies
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own bookmarks, everything else is private (for now)
-- Actually for Phase 8 (Social), we need public read access if we want to share lists.
-- Let's allow READ for everyone (for shared profiles) but WRITE only for owner.

CREATE POLICY "Bookmarks are viewable by everyone" ON bookmarks FOR SELECT USING (true);
CREATE POLICY "Users can insert their own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Visits are viewable by everyone" ON visits FOR SELECT USING (true);
CREATE POLICY "Users can insert their own visits" ON visits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own visits" ON visits FOR DELETE USING (auth.uid() = user_id);
