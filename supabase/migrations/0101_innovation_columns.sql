-- Phase 1: Innovation columns for Google-beating features

-- Photo classification and food photos
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS photo_classifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS food_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS photos_sorted TEXT[];

-- Multilingual AI summary
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS multilingual_summary JSONB;
-- Structure: { ja: string[], en: string[], ko: string[], zh: string[] }

-- Inbound tourist scores
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS inbound_scores JSONB;
-- Structure: { englishFriendly: 0-100, cardsAccepted: 0-100, veganConfidence: 0-100, touristPopular: 0-100 }

COMMENT ON COLUMN restaurants.photo_classifications IS 'AI-classified photos: type (food/interior/exterior), dishName';
COMMENT ON COLUMN restaurants.food_photos IS 'Food photos with dish names extracted by AI';
COMMENT ON COLUMN restaurants.multilingual_summary IS 'AI summary in 4 languages: ja, en, ko, zh';
COMMENT ON COLUMN restaurants.inbound_scores IS 'Tourist-friendly scores: englishFriendly, cardsAccepted, veganConfidence, touristPopular';
