# Zao Wallet API

A hosted crypto wallet API built with TypeScript, Express.js, and Clean Architecture principles. Supports multiple cryptocurrencies including Bitcoin, Ethereum, Cardano, and Solana with full M-Pesa integration for seamless fiat-to-crypto transactions.

## Features

- 🔐 **Multi-token Support**: Bitcoin, Ethereum, Cardano, and Solana
- 👤 **User Management**: Email/phone registration with verification
- 💰 **Wallet Creation**: Automatic wallet and address generation for each supported token
- 🔑 **Secure Key Management**: Master keys stored encrypted in HashiCorp Vault
- 📱 **Multi-channel Verification**: Email and SMS verification
- 🏦 **M-Pesa Integration**: Full M-Pesa STK Push (buy) and B2C (sell) integration
- 💱 **Quote-Based Trading**: Real-time crypto quotes with M-Pesa payment processing
- 🔄 **Transaction Management**: Send, receive, and track crypto transactions
- 📞 **M-Pesa Callbacks**: Automated payment confirmation and disbursement processing

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
- **Payment Processing**: M-Pesa Daraja API (STK Push & B2C)
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
- M-Pesa Daraja API credentials (for payment processing)


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
