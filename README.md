# Grey Wallet API

A hosted crypto wallet API built with TypeScript, Express.js, and Clean Architecture principles. Supports multiple cryptocurrencies including Bitcoin, Ethereum, Cardano, and Solana.

## Features

- 🔐 **Multi-token Support**: Bitcoin, Ethereum, Cardano, and Solana
- 👤 **User Management**: Email/phone registration with verification
- 💰 **Wallet Creation**: Automatic wallet and address generation for each supported token
- 🔑 **Secure Key Management**: Master keys stored encrypted in HashiCorp Vault
- 📱 **Multi-channel Verification**: Email and SMS verification
- 🏦 **On/Off Ramp**: Fiat integration with M-Pesa and other payment methods
- 🔄 **Transaction Management**: Send, receive, and track crypto transactions

## Architecture

This project follows Clean Architecture principles with clear separation of concerns:

```
src/
├── domain/           # Enterprise Business Rules (Entities, Use Cases)
├── application/      # Application Business Rules (Services, DTOs)
├── infrastructure/   # External Interfaces (Database, APIs, UI)
└── presentation/     # User Interface (Controllers, Views)

shared/               # Shared utilities (Config, Logging)
tests/                # Test files
```

### Domain Layer
- **Entities**: Core business objects (User, Wallet, SupportedToken)
- **Use Cases**: Business workflows (SignUp, VerifyEmail, etc.)
- **Repository Interfaces**: Data access contracts

### Application Layer
- **Services**: Application business logic
- **DTOs**: Data Transfer Objects
- **Interfaces**: Application contracts

### Infrastructure Layer
- **Repositories**: Data access implementations
- **External APIs**: Third-party integrations
- **Database**: Data persistence with Prisma

### Presentation Layer
- **Controllers**: Request/Response handling
- **Routes**: API endpoint definitions
- **Middleware**: Request processing

## Tech Stack

- **Runtime**: Node.js 21+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth (exclusively)
- **Key Management**: HashiCorp Vault
- **Logging**: Winston
- **Validation**: Express Validator
- **Testing**: Jest
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js 21+ 
- PostgreSQL 12+
- HashiCorp Vault (for production)
- Supabase account
- Twilio account (for SMS)
- SendGrid account (for email)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grey-wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file based on `env.example`:

```env
# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/grey_wallet?schema=public"

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Vault Configuration
VAULT_ENDPOINT=http://localhost:8200
VAULT_TOKEN=your_vault_token
VAULT_MOUNT_PATH=secret



# SMS Configuration (Twilio)
SMS_PROVIDER=twilio
SMS_API_KEY=your_twilio_account_sid
SMS_API_SECRET=your_twilio_auth_token

# Email Configuration (SendGrid)
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@greywallet.com
```

## API Endpoints

### Authentication (Supabase Auth)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/me` - Get current user profile

### Users
- `GET /api/user` - Get user profile
- `PUT /api/user` - Update user profile

### Wallet
- `GET /api/wallet` - Get wallet information
- `GET /api/wallet/addresses` - Get wallet addresses
- `POST /api/wallet/send` - Send transaction
- `GET /api/wallet/transactions` - Get transaction history

## Database Schema

The application uses the following main entities:

- **User**: User account information
- **Wallet**: User's crypto wallet
- **AddressList**: Token-specific addresses
- **SupportedToken**: Supported cryptocurrencies
- **Transaction**: Transaction records
- **TransactionDirection**: Transaction types (ON_RAMP, OFF_RAMP, etc.)
- **PaymentType**: Payment methods (M_PESA, TOKEN, etc.)

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio

# Testing
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm run format      # Format code with Prettier
```

### Project Structure

```
grey-wallet/
├── src/
│   ├── domain/
│   │   ├── entities/          # Domain entities
│   │   ├── use_cases/         # Business use cases
│   │   └── repositories/      # Repository interfaces
│   ├── application/
│   │   ├── services/          # Application services
│   │   ├── dto/              # Data Transfer Objects
│   │   └── interfaces/       # Service interfaces
│   ├── infrastructure/
│   │   ├── repositories/     # Repository implementations
│   │   ├── external_apis/    # Third-party integrations
│   │   └── database/         # Database configurations
│   └── presentation/
│       ├── controllers/      # HTTP controllers
│       ├── routes/           # API routes
│       └── middleware/       # Express middleware
├── shared/
│   ├── config/              # Configuration management
│   ├── logging/             # Logging utilities
│   └── utils/               # Common utilities
├── tests/                   # Test files
├── prisma/                  # Database schema and migrations
└── logs/                    # Application logs
```

## Security Features

- **Supabase Auth**: Secure authentication and session management
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Cross-origin resource sharing control
- **Helmet Security**: Security headers middleware
- **Vault Integration**: Secure key storage and management

## Testing

The project includes comprehensive testing setup:

- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete workflows
- **Performance Tests**: Load and stress testing

Run tests with:
```bash
npm test
```

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker Deployment

```dockerfile
FROM node:21-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Considerations

- Use strong JWT secrets in production
- Configure proper CORS origins
- Set up SSL/TLS certificates
- Configure proper logging levels
- Set up monitoring and alerting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please open an issue in the repository.
