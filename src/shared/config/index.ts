import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
}

export interface VaultConfig {
  endpoint: string;
  token: string;
  mountPath: string;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
}

export interface MpesaConfig {
  // Basic M-Pesa API credentials
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  apiPassKey: string;
  tokenUrl: string;
  
  // STK Push configuration (for buy crypto)
  stkPushUrl: string;
  stkPushPartyB: string;
  stkPushResultUrl: string;
  stkPushTimeoutUrl: string;
  
  // B2C configuration (for sell crypto - disbursements)
  b2cUrl: string;
  b2cShortCode: string;
  b2cInitiatorName: string;
  b2cInitiatorPassword: string;
  b2cResultUrl: string;
  b2cTimeoutUrl: string;
  securityCredential: string;
  
  // B2B configuration (for business payments)
  b2bUrl: string;
  b2bPartyA: string;
  b2bInitiatorName: string;
  b2bSenderIdentifierType: string;
  b2bReceiverIdentifierType: string;
  b2bResultUrl: string;
  b2bTimeoutUrl: string;
}

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  corsOrigin: string;
}

export interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  vault: VaultConfig;
  jwt: JWTConfig;
  mpesa: MpesaConfig;
}

const config: Config = {
  server: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    host: process.env['HOST'] || 'localhost',
    nodeEnv: process.env['NODE_ENV'] || 'development',
    corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  },
  database: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    username: process.env['DB_USERNAME'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    database: process.env['DB_NAME'] || 'grey_wallet',
    ssl: process.env['DB_SSL'] === 'true',
  },
  vault: {
    endpoint: process.env['VAULT_ENDPOINT'] || 'http://localhost:8200',
    token: process.env['VAULT_TOKEN'] || '',
    mountPath: process.env['VAULT_MOUNT_PATH'] || 'secret',
  },
  jwt: {
    secret: process.env['JWT_SECRET'] || 'your-secret-key',
    expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  },
  mpesa: {
    // Basic M-Pesa API credentials
    consumerKey: process.env['DARAJA_CONSUMER_KEY'] || '',
    consumerSecret: process.env['DARAJA_CONSUMER_SECRET'] || '',
    shortCode: process.env['DARAJA_SHORTCODE'] || '',
    apiPassKey: process.env['DARAJA_API_PASSKEY'] || '',
    tokenUrl: process.env['DARAJA_TOKEN_URL'] || '',
    
    // STK Push configuration (for buy crypto)
    stkPushUrl: process.env['DARAJA_STK_PUSH_URL'] || '',
    stkPushPartyB: process.env['DARAJA_STK_PUSH_PARTY_B'] || '',
    stkPushResultUrl: process.env['DARAJA_STK_PUSH_RESULT_URL'] || '',
    stkPushTimeoutUrl: process.env['DARAJA_STK_PUSH_TIMEOUT_URL'] || '',
    
    // B2C configuration (for sell crypto - disbursements)
    b2cUrl: process.env['DARAJA_B2C_API_URL'] || '',
    b2cShortCode: process.env['DARAJA_B2C_SHORTCODE'] || '',
    b2cInitiatorName: process.env['DARAJA_B2C_INITIATOR_NAME'] || '',
    b2cInitiatorPassword: process.env['DARAJA_B2C_INITIATOR_PASSWORD'] || '',
    b2cResultUrl: process.env['DARAJA_B2C_RESULT_URL'] || '',
    b2cTimeoutUrl: process.env['DARAJA_B2C_QUEUE_TIMEOUT_URL'] || '',
    securityCredential: process.env['DARAJA_SECURITY_CREDENTIAL'] || '',
    
    // B2B configuration (for business payments)
    b2bUrl: process.env['DARAJA_B2B_API_URL'] || '',
    b2bPartyA: process.env['DARAJA_B2B_PARTY_A'] || '',
    b2bInitiatorName: process.env['DARAJA_B2B_INITIATOR_NAME'] || '',
    b2bSenderIdentifierType: process.env['DARAJA_B2B_SENDER_IDENTIFIER_TYPE'] || '4',
    b2bReceiverIdentifierType: process.env['DARAJA_B2B_RECEIVER_IDENTIFIER_TYPE'] || '4',
    b2bResultUrl: process.env['DARAJA_B2B_RESULT_URL'] || '',
    b2bTimeoutUrl: process.env['DARAJA_B2B_QUEUE_TIMEOUT_URL'] || '',
  },
};

export default config; 