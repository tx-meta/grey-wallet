-- Update existing supported tokens with CoinGecko icon URLs

-- Update Bitcoin icon
UPDATE "supported_tokens" 
SET "icon" = 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', "updatedAt" = NOW()
WHERE "symbol" = 'BTC';

-- Update Ethereum icon  
UPDATE "supported_tokens" 
SET "icon" = 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', "updatedAt" = NOW()
WHERE "symbol" = 'ETH';

-- Update Tether USD icon
UPDATE "supported_tokens" 
SET "icon" = 'https://assets.coingecko.com/coins/images/325/small/Tether.png', "updatedAt" = NOW()
WHERE "symbol" = 'USDT';

-- Update USD Coin icon
UPDATE "supported_tokens" 
SET "icon" = 'https://assets.coingecko.com/coins/images/6319/small/usdc.png', "updatedAt" = NOW()
WHERE "symbol" = 'USDC';

-- Update Cardano icon
UPDATE "supported_tokens" 
SET "icon" = 'https://assets.coingecko.com/coins/images/975/small/cardano.png', "updatedAt" = NOW()
WHERE "symbol" = 'ADA';

-- Update Solana icon
UPDATE "supported_tokens" 
SET "icon" = 'https://assets.coingecko.com/coins/images/4128/small/solana.png', "updatedAt" = NOW()
WHERE "symbol" = 'SOL';