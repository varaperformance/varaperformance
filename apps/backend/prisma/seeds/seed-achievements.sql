-- Seed achievements (upsert by slug)

INSERT INTO "Achievement" (id, slug, name, description, icon, category, threshold, "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  -- WORKOUT
  (gen_random_uuid(), 'first-workout',  'First Workout',   'Log your very first workout session',  'dumbbell', 'WORKOUT'::"AchievementCategory",   1,   true, 1, now(), now()),
  (gen_random_uuid(), '10-workouts',    'Getting Started', 'Complete 10 workout sessions',          'zap',      'WORKOUT'::"AchievementCategory",  10,   true, 2, now(), now()),
  (gen_random_uuid(), '50-workouts',    'Dedicated',       'Complete 50 workout sessions',          'flame',    'WORKOUT'::"AchievementCategory",  50,   true, 3, now(), now()),
  (gen_random_uuid(), '100-workouts',   'Century Club',    'Complete 100 workout sessions',         'trophy',   'WORKOUT'::"AchievementCategory", 100,   true, 4, now(), now()),
  -- STREAK
  (gen_random_uuid(), '7-day-streak',   'Week Warrior',    'Maintain a 7-day habit streak',         'flame',    'STREAK'::"AchievementCategory",   7,   true, 1, now(), now()),
  (gen_random_uuid(), '30-day-streak',  'Monthly Master',  'Maintain a 30-day habit streak',        'calendar-check', 'STREAK'::"AchievementCategory",  30, true, 2, now(), now()),
  (gen_random_uuid(), '100-day-streak', 'Unstoppable',     'Maintain a 100-day habit streak',       'crown',    'STREAK'::"AchievementCategory", 100,   true, 3, now(), now()),
  -- NUTRITION
  (gen_random_uuid(), 'first-food-log', 'Calorie Counter', 'Log your first food entry',             'utensils-crossed', 'NUTRITION'::"AchievementCategory", 1, true, 1, now(), now()),
  (gen_random_uuid(), '100-food-logs',  'Nutrition Nerd',  'Log 100 food entries',                  'chef-hat', 'NUTRITION'::"AchievementCategory", 100, true, 2, now(), now()),
  -- COACHING
  (gen_random_uuid(), 'first-session',  'Coached Up',      'Complete your first coaching session',  'users',    'COACHING'::"AchievementCategory",   1,   true, 1, now(), now()),
  -- SOCIAL
  (gen_random_uuid(), 'first-post',           'Social Butterfly',  'Create your first community post',        'message-circle', 'SOCIAL'::"AchievementCategory", 1, true, 1, now(), now()),
  (gen_random_uuid(), 'create-challenge',     'Challenge Creator', 'Create your first community challenge',   'flag',           'SOCIAL'::"AchievementCategory", 1, true, 2, now(), now()),
  (gen_random_uuid(), 'challenge-participant', 'Challenger',        'Participate in your first challenge',     'swords',         'SOCIAL'::"AchievementCategory", 1, true, 3, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  category    = EXCLUDED.category,
  threshold   = EXCLUDED.threshold,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = now();
