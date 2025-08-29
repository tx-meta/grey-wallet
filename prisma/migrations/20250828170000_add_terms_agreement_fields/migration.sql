-- Add terms agreement fields to users table
ALTER TABLE "users" ADD COLUMN "agreedToTerms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "termsVersion" TEXT NOT NULL DEFAULT '0.0.1';

-- Create index on termsVersion for potential future queries
CREATE INDEX "users_terms_version_idx" ON "users"("termsVersion");
