import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user and return access token', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const mockUser = {
        id: 'user-123',
        email: registerDto.email,
        name: registerDto.name,
        password: 'hashed-password',
        role: 'FOUNDER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('access_token');
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user).not.toHaveProperty('password');
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
    });

    it('should hash the password before storing', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrismaService.user.create.mockImplementation(async (args) => {
        // Verify password is hashed
        const isHashed = await bcrypt.compare(registerDto.password, args.data.password);
        expect(isHashed).toBe(true);
        return { id: 'user-123', ...args.data };
      });
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');

      await service.register(registerDto);
    });
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        password: hashedPassword,
        name: 'Test User',
        role: 'FOUNDER',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user.email).toBe(loginDto.email);
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        password: hashedPassword,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findOrCreateMockUser', () => {
    it('should return existing user if found', async () => {
      const profile = {
        email: 'google@example.com',
        name: 'Google User',
        googleId: 'google-123',
      };

      const existingUser = {
        id: 'user-123',
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      const result = await service.findOrCreateMockUser(profile);

      expect(result).toEqual(existingUser);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      const profile = {
        email: 'newgoogle@example.com',
        name: 'New Google User',
        googleId: 'google-456',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-456',
        ...profile,
        password: '',
        role: 'FOUNDER',
      });

      const result = await service.findOrCreateMockUser(profile);

      expect(result).toHaveProperty('id', 'user-456');
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      mockJwtService.signAsync.mockResolvedValue('generated-token');

      const token = await service.generateToken(user);

      expect(token).toBe('generated-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
      });
    });
  });
});
