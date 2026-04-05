
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Create user first
        let user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
            },
        });

        // Auto-create a default organization for the user
        const orgName = dto.name ? `${dto.name}'s Organization` : 'My Organization';
        const organization = await this.prisma.organization.create({
            data: {
                name: orgName,
                industry: 'Technology',
                country: 'IN',
                currency: 'INR',
                users: { connect: { id: user.id } }
            }
        });

        // Update user with organization
        user = await this.prisma.user.update({
            where: { id: user.id },
            data: { organizationId: organization.id }
        });

        const { access_token } = await this.signToken(user.id, user.email);
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: { ...userWithoutPassword, organizationId: organization.id },
            access_token,
            organization: { id: organization.id, name: organization.name }
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { organization: true }
        });

        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');

        const { access_token } = await this.signToken(user.id, user.email);
        const { password: _, organization, ...userWithoutPassword } = user;
        return {
            user: { ...userWithoutPassword, organizationId: user.organizationId },
            access_token,
            organization: organization ? { id: organization.id, name: organization.name } : null
        };
    }


    async signToken(userId: string, email: string) {
        const payload = { sub: userId, email };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }

    async generateToken(user: any): Promise<string> {
        const payload = { sub: user.id, email: user.email };
        return this.jwtService.signAsync(payload);
    }

    /**
     * Finds or creates a user after successful OAuth (Google) authentication.
     * Ensures every user has an associated Organization for platform functionality.
     */
    async findOrCreateUserByOAuth(profile: { email: string; name: string; googleId: string }) {
        let user = await this.prisma.user.findUnique({
            where: { email: profile.email },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: profile.email,
                    name: profile.name,
                    password: '', // OAuth users have no password
                    role: 'FOUNDER',
                    googleId: profile.googleId,
                },
            });
        }

        // Ensure user has an organization (critical for almost all platform features)
        if (!user.organizationId) {
            const orgName = user.name ? `${user.name}'s Organization` : 'My Organization';
            const organization = await this.prisma.organization.create({
                data: {
                    name: orgName,
                    industry: 'Not Specified',
                    country: 'IN',
                    currency: 'INR',
                    users: { connect: { id: user.id } },
                },
            });

            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { organizationId: organization.id },
            });
        }

        return user;
    }
}
