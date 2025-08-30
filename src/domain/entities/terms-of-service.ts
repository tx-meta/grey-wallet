/**
 * Terms of Service Domain Entity
 * Represents the terms of service for the crypto wallet system
 */

export interface TermsOfServiceProps {
  tosVersion: number;
  terms: string;
  createdAt: Date;
}

export class TermsOfService {
  private readonly props: TermsOfServiceProps;

  constructor(props: TermsOfServiceProps) {
    this.validateTermsOfService(props);
    this.props = props;
  }

  // Getters
  get tosVersion(): number {
    return this.props.tosVersion;
  }

  get terms(): string {
    return this.props.terms;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // Business methods
  isLatestVersion(compareVersion: number): boolean {
    return this.props.tosVersion >= compareVersion;
  }

  // Static factory method
  static create(terms: string): TermsOfService {
    return new TermsOfService({
      tosVersion: 1, // This will be overridden by the database
      terms,
      createdAt: new Date(),
    });
  }

  private validateTermsOfService(props: TermsOfServiceProps): void {
    if (props.tosVersion <= 0) {
      throw new Error('Terms of service version must be a positive integer');
    }

    if (!props.terms || props.terms.trim().length === 0) {
      throw new Error('Terms content cannot be empty');
    }

    if (props.terms.length > 10000) {
      throw new Error('Terms content is too long (max 10,000 characters)');
    }
  }
}
