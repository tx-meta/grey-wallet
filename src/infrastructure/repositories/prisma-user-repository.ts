/**
 * Prisma User Repository Implementation
 * Real database implementation using Prisma ORM
 */

import { User } from '../../domain/entities/user';
import { UserRepository } from '../../domain/repositories/user-repository';
import prisma from '../database/prisma-client';

export class PrismaUserRepository implements UserRepository {
  async save(user: User): Promise<User> {
    console.log('🔍 PrismaUserRepository.save called with user:', {
      id: user.id,
      email: user.email
    });
    
    try {
      const savedUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          passwordHash: user.passwordHash,
          ...(user.country && { country: user.country }),
          ...(user.currency && { currency: user.currency }),
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          isActive: user.isActive,
        },
      });

      console.log('✅ PrismaUserRepository.save successful:', savedUser.id);
      return this.mapToDomain(savedUser);
    } catch (error) {
      console.error('❌ PrismaUserRepository.save failed:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ? this.mapToDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapToDomain(user) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    return user ? this.mapToDomain(user) : null;
  }

  async update(user: User): Promise<User> {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        phone: user.phone,
        passwordHash: user.passwordHash,
        ...(user.country && { country: user.country }),
        ...(user.currency && { currency: user.currency }),
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isActive: user.isActive,
      },
    });

    return this.mapToDomain(updatedUser);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async findActiveUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { isActive: true },
    });

    return users.map(user => this.mapToDomain(user));
  }

  async findUsersByCountry(country: string): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { country },
    });

    return users.map(user => this.mapToDomain(user));
  }

  private mapToDomain(prismaUser: any): User {
    return new User({
      id: prismaUser.id,
      email: prismaUser.email,
      phone: prismaUser.phone,
      passwordHash: prismaUser.passwordHash,
      country: prismaUser.country,
      currency: prismaUser.currency,
      isEmailVerified: prismaUser.isEmailVerified,
      isPhoneVerified: prismaUser.isPhoneVerified,
      isActive: prismaUser.isActive,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    });
  }
} 