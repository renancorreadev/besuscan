# AA Banking System - Makefile Guide

## Overview

This Makefile provides an elegant and comprehensive interface for managing the AA Banking system. It includes colorized output, comprehensive help system, and organized targets for all operations.

## Quick Start

```bash
# 1. Initialize environment
source init.sh

# 2. Deploy the system
make deploy

# 3. Setup a complete client
make setup-client

# 4. Show help
make help
```

## Available Commands

### Deployment Commands

| Command | Description |
|---------|-------------|
| `make deploy` | Deploy the complete AA Banking system |
| `make deploy-step` | Deploy system step by step |
| `make env-setup` | Setup environment variables |

### Client Management Commands

| Command | Description |
|---------|-------------|
| `make create-account` | Create AA account for client |
| `make setup-kyc` | Configure KYC/AML for client |
| `make setup-multisig` | Configure multi-signature for account |
| `make setup-recovery` | Configure social recovery for account |
| `make setup-client` | Complete client setup (all steps) |

### Transaction Management Commands

| Command | Description |
|---------|-------------|
| `make approve-tx` | Approve multi-signature transaction |
| `make execute-tx` | Execute multi-signature transaction |

### Recovery Management Commands

| Command | Description |
|---------|-------------|
| `make approve-recovery` | Approve social recovery |
| `make execute-recovery` | Execute social recovery |
| `make emergency-recovery` | Emergency recovery (CRITICAL) |

### Utility Commands

| Command | Description |
|---------|-------------|
| `make help` | Show help message |
| `make status` | Show system status |
| `make clean` | Clean temporary files |

### Advanced Commands

| Command | Description |
|---------|-------------|
| `make quick-setup` | Quick complete setup |
| `make test-setup` | Test setup (basic functionality) |
| `make production-setup` | Production setup with all features |
| `make dev-setup` | Development environment setup |
| `make build` | Build contracts |
| `make test` | Run tests |

## Configuration

### Environment Variables

The Makefile uses environment variables for configuration. You can:

1. **Use the init script** (recommended):
   ```bash
   source init.sh
   ```

2. **Load from config file**:
   ```bash
   source config.env
   ```

3. **Set manually**:
   ```bash
   export BESU_RPC_URL="http://144.22.179.183"
   export BESU_PRIVATE_KEY="0x..."
   # ... other variables
   ```

### Configuration File

Copy `config.env.example` to `config.env` and customize:

```bash
cp config.env.example config.env
# Edit config.env with your values
```

## Usage Examples

### Complete System Setup

```bash
# 1. Initialize environment
source init.sh

# 2. Deploy system
make deploy

# 3. Setup complete client
make setup-client
```

### Step-by-Step Setup

```bash
# 1. Deploy system
make deploy

# 2. Create account
make create-account

# 3. Configure KYC
make setup-kyc

# 4. Configure multi-sig
make setup-multisig

# 5. Configure recovery
make setup-recovery
```

### Transaction Management

```bash
# Approve a transaction
make approve-tx

# Execute a transaction
make execute-tx
```

### Recovery Management

```bash
# Approve recovery
make approve-recovery

# Execute recovery
make execute-recovery

# Emergency recovery (with confirmation)
make emergency-recovery
```

## Features

### Colorized Output

The Makefile provides colorized output for better readability:
- 🔵 Blue: Information and headers
- 🟢 Green: Success messages
- 🟡 Yellow: Warnings and highlights
- 🔴 Red: Errors and critical operations
- 🟣 Purple: Deployment operations
- 🔵 Cyan: Client management operations

### Comprehensive Help

```bash
make help
```

Shows all available commands with descriptions and examples.

### Status Display

```bash
make status
```

Shows current system status including:
- Environment variables
- Available scripts
- System readiness

### Error Handling

The Makefile includes proper error handling:
- Validates configuration before execution
- Provides clear error messages
- Exits gracefully on failures

## Customization

### Adding New Commands

To add new commands to the Makefile:

1. Add the target:
   ```makefile
   .PHONY: my-command
   my-command: env-setup ## Description of my command
   	@echo "$(BOLD)$(BLUE)Executing my command...$(RESET)"
   	@$(SCRIPTS_DIR)/my-script.sh
   	@echo "$(GREEN)My command completed!$(RESET)"
   ```

2. Add to help section:
   ```makefile
   @echo "  $(CYAN)my-command$(RESET)     Description of my command"
   ```

### Modifying Scripts

Scripts are located in `script/run/` directory. Each script:
- Loads environment variables
- Executes forge commands
- Provides feedback
- Handles errors

### Environment Variables

Key environment variables:
- `BESU_RPC_URL`: RPC endpoint
- `BESU_PRIVATE_KEY`: Private key for transactions
- `CHAIN_ID`: Blockchain chain ID
- `BANK_MANAGER`: Bank manager contract address
- `CLIENT_ADDRESS`: Client address
- And many more...

## Troubleshooting

### Common Issues

1. **"Command not found"**
   - Ensure you're in the correct directory
   - Check if Makefile exists

2. **"Permission denied"**
   - Make scripts executable: `chmod +x script/run/*.sh`
   - Check file permissions

3. **"Environment variables not set"**
   - Run `source init.sh` first
   - Check configuration file

4. **"Contract not found"**
   - Deploy contracts first: `make deploy`
   - Update contract addresses in config

### Debug Mode

Enable debug mode by setting:
```bash
export DEBUG=true
export VERBOSE=true
```

### Dry Run

Test commands without execution:
```bash
export DRY_RUN=true
make <command>
```

## Best Practices

1. **Always initialize environment first**:
   ```bash
   source init.sh
   ```

2. **Use step-by-step deployment for complex setups**:
   ```bash
   make deploy-step
   ```

3. **Verify configuration before deployment**:
   ```bash
   make status
   ```

4. **Use production setup for production environments**:
   ```bash
   make production-setup
   ```

5. **Test with test setup first**:
   ```bash
   make test-setup
   ```

## Integration

### CI/CD Integration

The Makefile can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Deploy AA Banking System
  run: |
    source init.sh
    make deploy
    make setup-client
```

### Docker Integration

```dockerfile
# Example Dockerfile
FROM foundry:latest
COPY . /app
WORKDIR /app
RUN make build
CMD ["make", "deploy"]
```

## Support

For issues and questions:
1. Check the help: `make help`
2. Verify configuration: `make status`
3. Check logs for detailed error messages
4. Ensure all dependencies are installed

## License

This Makefile is part of the AA Banking System and follows the same license terms.
