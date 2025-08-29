-- Create terms_of_service table
CREATE TABLE "terms_of_service" (
    "tos_version" SERIAL PRIMARY KEY,
    "terms" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert the first record with version 1
INSERT INTO "terms_of_service" ("tos_version", "terms") VALUES (
    1,
    '<html><head><style>.container{padding:16px;font-family:-apple-system,system-ui,sans-serif}.title{font-size:20px;font-weight:700;margin-bottom:8px;color:#333}.date{font-size:14px;color:#666;margin-bottom:16px}.section-title{font-size:16px;font-weight:700;margin-top:16px;margin-bottom:8px;color:#444}.content{font-size:14px;line-height:1.5;color:#333;margin-bottom:12px}</style></head><body><div class="container"><div class="title">Terms of Service for CryptoApp</div><div class="date">Last Updated: February 1, 2025</div><div class="content">By using CryptoApp, you agree to these terms:</div><div class="section-title">1. ELIGIBILITY</div><div class="content">You must be at least 18 years old and legally able to enter into contracts. You are responsible for ensuring your use of our service complies with your local laws.</div><div class="section-title">2. ACCOUNT SECURITY</div><div class="content">You are responsible for maintaining your private keys and wallet security. We cannot recover lost keys or passwords. Keep your authentication credentials confidential.</div><div class="section-title">3. RISKS</div><div class="content">Cryptocurrency trading involves substantial risk. Market values can be highly volatile. You acknowledge that you could lose your entire investment. We are not responsible for market fluctuations or trading losses.</div><div class="section-title">4. SERVICE AVAILABILITY</div><div class="content">We strive for 99.9% uptime but don not guarantee uninterrupted service. We may suspend service for maintenance or security reasons.</div><div class="section-title">5. PROHIBITED ACTIVITIES</div><div class="content">You agree not to use our service for illegal activities, market manipulation, or fraud. We reserve the right to suspend accounts engaging in suspicious behavior.</div><div class="section-title">6. LIABILITY</div><div class="content">Our liability is limited to the amount you paid for our service in the past 12 months. We are not liable for indirect or consequential damages.</div><div class="section-title">7. CHANGES</div><div class="content">We may modify these terms with 30 days notice. Your continued use after changes constitutes acceptance.</div></div></body></html>'
);

-- Create index on tos_version for efficient queries
CREATE INDEX "terms_of_service_version_idx" ON "terms_of_service"("tos_version");
