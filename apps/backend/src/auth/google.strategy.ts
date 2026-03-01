import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'your-client-id',
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'your-client-secret',
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/auth/google/callback',
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { id, name, emails, photos } = profile;
        const email = emails[0].value;

        // Check if user exists
        let user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Create new user with Google profile
            user = await this.prisma.user.create({
                data: {
                    email,
                    name: `${name.givenName} ${name.familyName}`,
                    password: '', // No password for OAuth users
                    role: 'FOUNDER',
                    googleId: id,
                },
            });
        } else if (!user.googleId) {
            // Link existing account to Google
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { googleId: id },
            });
        }

        done(null, user);
    }
}
