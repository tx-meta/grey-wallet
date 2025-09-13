/**
 * SupportedToken Domain Entity
 * Represents supported cryptocurrencies in the wallet system
 */

export interface SupportedTokenProps {
  tokenId: string;
  name: string;
  symbol: string;
  icon: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SupportedToken {
  private readonly props: SupportedTokenProps;

  constructor(props: SupportedTokenProps) {
    this.validateToken(props);
    this.props = props;
  }

  // Getters
  get tokenId(): string {
    return this.props.tokenId;
  }

  get name(): string {
    return this.props.name;
  }

  get symbol(): string {
    return this.props.symbol;
  }

  get icon(): string {
    return this.props.icon;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  updateIcon(newIcon: string): void {
    if (!newIcon || newIcon.trim().length === 0) {
      throw new Error('Icon URL cannot be empty');
    }
    this.props.icon = newIcon.trim();
    this.props.updatedAt = new Date();
  }

  // Validation methods
  private validateToken(props: SupportedTokenProps): void {
    if (!props.tokenId || props.tokenId.trim().length === 0) {
      throw new Error('Token ID is required');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Token name is required');
    }
    if (!props.symbol || props.symbol.trim().length === 0) {
      throw new Error('Token symbol is required');
    }
    if (!props.icon || props.icon.trim().length === 0) {
      throw new Error('Token icon is required');
    }
  }

  // Factory method for creating new tokens
  static create(name: string, symbol: string, icon: string): SupportedToken {
    const now = new Date();
    return new SupportedToken({
      tokenId: crypto.randomUUID(),
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      icon: icon.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Predefined tokens for the wallet system
  static getDefaultTokens(): SupportedToken[] {
    return [
      SupportedToken.create('Bitcoin', 'BTC', '/icons/bitcoin.svg'),
      SupportedToken.create('Ethereum', 'ETH', '/icons/ethereum.svg'),
      SupportedToken.create('Tether USD', 'USDT', '/icons/usdt.svg'),
      SupportedToken.create('USD Coin', 'USDC', '/icons/usdc.svg'),
      SupportedToken.create('Cardano', 'ADA', '/icons/cardano.svg'),
      SupportedToken.create('Solana', 'SOL', '/icons/solana.svg'),
    ];
  }

  // Convert to plain object for persistence
  toJSON(): SupportedTokenProps {
    return { ...this.props };
  }
} 