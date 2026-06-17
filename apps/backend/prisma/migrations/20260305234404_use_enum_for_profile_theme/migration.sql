-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('light', 'dark', 'system');

-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- AlterTable
ALTER TABLE "Profile"
ALTER COLUMN "theme" TYPE "ThemePreference"
USING (
  CASE
    WHEN "theme" IS NULL THEN NULL
    WHEN lower("theme") = 'light' THEN 'light'::"ThemePreference"
    WHEN lower("theme") = 'dark' THEN 'dark'::"ThemePreference"
    WHEN lower("theme") = 'system' THEN 'system'::"ThemePreference"
    ELSE NULL
  END
);
