import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
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

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  corsOrigin: string;
}

export interface SMSConfig {
  provider: string;
  apiKey: string;
  apiSecret: string;
}

export interface EmailConfig {
  provider: string;
  apiKey: string;
  fromEmail: string;
}

export interface Config {
  server: ServerConfig;
  supabase: SupabaseConfig;
  vault: VaultConfig;
  jwt: JWTConfig;
  sms: SMSConfig;
  email: EmailConfig;
}

const config: Config = {
  server: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    host: process.env['HOST'] || 'localhost',
    nodeEnv: process.env['NODE_ENV'] || 'development',
    corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  },
  supabase: {
    url: process.env['SUPABASE_URL'] || '',
    anonKey: process.env['SUPABASE_ANON_KEY'] || '',
    serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] || '',
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
  sms: {
    provider: process.env['SMS_PROVIDER'] || 'twilio',
    apiKey: process.env['SMS_API_KEY'] || '',
    apiSecret: process.env['SMS_API_SECRET'] || '',
  },
  email: {
    provider: process.env['EMAIL_PROVIDER'] || 'sendgrid',
    apiKey: process.env['EMAIL_API_KEY'] || '',
    fromEmail: process.env['FROM_EMAIL'] || 'noreply@greywallet.com',
  },
};

export default config; 