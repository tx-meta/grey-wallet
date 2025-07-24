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
};

export default config; 