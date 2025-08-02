/**
 * User Domain Entity
 * Represents a user in the crypto wallet system
 */

export interface UserProps {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  country?: string;
  currency?: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private readonly props: UserProps;

  constructor(props: UserProps) {
    this.validateUser(props);
    this.props = props;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get phone(): string {
    return this.props.phone;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get country(): string | undefined {
    return this.props.country;
  }

  get currency(): string | undefined {
    return this.props.currency;
  }

  get firstName(): string | undefined {
    return this.props.firstName;
  }

  get lastName(): string | undefined {
    return this.props.lastName;
  }

  get isEmailVerified(): boolean {
    return this.props.isEmailVerified;
  }

  get isPhoneVerified(): boolean {
    return this.props.isPhoneVerified;
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

  get fullName(): string {
    const firstName = this.props.firstName || '';
    const lastName = this.props.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  }

  // Business methods
  verifyEmail(): void {
    this.props.isEmailVerified = true;
    this.props.updatedAt = new Date();
  }

  verifyPhone(): void {
    this.props.isPhoneVerified = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  updateProfile(firstName: string, lastName: string, country: string, currency: string): void {
    this.validateName(firstName, lastName);
    this.validateCountry(country);
    this.validateCurrency(currency);

    this.props.firstName = firstName.trim();
    this.props.lastName = lastName.trim();
    this.props.country = country.trim();
    this.props.currency = currency.trim();
    this.props.updatedAt = new Date();
  }

  isFullyVerified(): boolean {
    return this.props.isEmailVerified && this.props.isPhoneVerified;
  }

  // Validation methods
  private validateUser(props: UserProps): void {
    this.validateEmail(props.email);
    this.validatePhone(props.phone);
    if (props.firstName || props.lastName) {
      this.validateName(props.firstName || '', props.lastName || '');
    }
    if (props.country) {
      this.validateCountry(props.country);
    }
    if (props.currency) {
      this.validateCurrency(props.currency);
    }
  }

  private validateEmail(_email: string): void {
    // Email validation temporarily deactivated - using express-validator isEmail() instead
    // const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // if (!email || !emailRegex.test(email)) {
    //   throw new Error('Invalid email address');
    // }
  }

  private validatePhone(phone: string): void {
    // Basic phone validation - can be enhanced based on country codes
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phone || !phoneRegex.test(phone) || phone.length < 10) {
      throw new Error('Invalid phone number');
    }
  }

  private validateName(firstName: string, lastName: string): void {
    if (!firstName || firstName.trim().length < 2) {
      throw new Error('First name must be at least 2 characters long');
    }
    if (!lastName || lastName.trim().length < 2) {
      throw new Error('Last name must be at least 2 characters long');
    }
  }

  private validateCountry(country: string): void {
    if (!country || country.trim().length < 2) {
      throw new Error('Country must be at least 2 characters long');
    }
  }

  private validateCurrency(currency: string): void {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'KES', 'NGN', 'GHS', 'UGX', 'TZS'];
    if (!currency || !validCurrencies.includes(currency.toUpperCase())) {
      throw new Error('Invalid currency code');
    }
  }

  // Factory method for creating new users
  static create(props: Omit<UserProps, 'id' | 'isEmailVerified' | 'isPhoneVerified' | 'isActive' | 'createdAt' | 'updatedAt'> & {
    firstName?: string;
    lastName?: string;
    country?: string;
    currency?: string;
  }): User {
    const now = new Date();
    return new User({
      ...props,
      id: crypto.randomUUID(),
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Convert to plain object for persistence
  toJSON(): UserProps {
    return { ...this.props };
  }
} 