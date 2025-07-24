/**
 * User Repository Interface
 * Defines the contract for user data access operations
 */

import { User } from '../entities/user';

export interface UserRepository {
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<boolean>;
  findActiveUsers(): Promise<User[]>;
  findUsersByCountry(country: string): Promise<User[]>;
} 