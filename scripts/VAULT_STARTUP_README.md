# Vault Startup Scripts

This directory contains scripts to automatically start and unseal HashiCorp Vault in Docker for development.

## Files

- `start-vault.sh` - Bash script to start and unseal Vault (Unix/Linux/macOS)
- `start-vault.js` - Node.js wrapper for cross-platform support and npm integration

## Usage

### Automatic (Recommended)
The vault startup is now integrated with npm scripts:

```bash
# Start the application (automatically starts and unseals Vault)
npm start

# Start in development mode (automatically starts and unseals Vault)
npm run dev

# If you want to start without Vault (fallback options)
npm run start:no-vault
npm run dev:no-vault

# Start Vault manually
npm run vault:start
```

### Manual
You can also run the scripts directly:

```bash
# Using Node.js script (cross-platform)
node scripts/start-vault.js

# Using bash script (Unix/Linux/macOS only)
./scripts/start-vault.sh
```

## What the Scripts Do

1. **Check Docker**: Verify Docker is running
2. **Start Container**: Create/start Vault container if not running
3. **Wait for Ready**: Wait for Vault to be responsive
4. **Export Variables**: Set `VAULT_ADDR=http://127.0.0.1:8200`
5. **Unseal Vault**: Use the three provided dev keys to unseal Vault

## Unseal Keys Used

The scripts use these development unseal keys:
- `JLjFN88Ea3nSsA8Rsl4aDUo0xgPQ5HGOgJnhc80hf0qV`
- `2ueLDqsMJ1wVkSTaBTXzPiSaq92x1pOdGLpsLxEjozHQ`
- `0xe1bMfZ571+lwmDVOotd2PQba1F4Bmtg0LeXp/dLV+6`

## Environment Variables

After running, these variables are available:
- `VAULT_ADDR=http://127.0.0.1:8200`
- `VAULT_TOKEN=myroot` (dev mode default)

## Docker Container Details

- **Container Name**: `vault`
- **Port**: `8200:8200`
- **Image**: `hashicorp/vault:latest`
- **Mode**: Development mode with root token `myroot`

## Troubleshooting

### Docker Not Running
```
❌ Docker is not running or not installed
Please start Docker Desktop or install Docker
```
**Solution**: Start Docker Desktop or install Docker

### Vault Failed to Start
```
❌ Vault failed to start after 30 attempts
```
**Solution**: Check Docker logs: `docker logs vault`

### Port Already in Use
If port 8200 is already in use, stop the existing process or container:
```bash
# Stop existing Vault container
docker stop vault
docker rm vault

# Or find and kill process using port 8200
lsof -ti:8200 | xargs kill -9
```

## Integration with Application

The application expects these environment variables:
- `VAULT_ADDR` - Vault server URL
- `VAULT_TOKEN` - Authentication token

These are automatically set when using the startup scripts.
