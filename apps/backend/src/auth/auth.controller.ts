import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Controller, Post, Body, Get, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
    ) { }

    // Strict rate limit on login: 5 attempts per minute
    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    // Strict rate limit on register: 3 per hour
    @Post('register')
    @Throttle({ default: { limit: 3, ttl: 3600000 } })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @SkipThrottle()
    async getCurrentUser(@Req() req: any) {
        return req.user;
    }

    // Google OAuth - skip throttle for OAuth flow
    @Get('google')
    @UseGuards(AuthGuard('google'))
    @SkipThrottle()
    async googleAuth() {
        // Guard initiates Google OAuth flow
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    @SkipThrottle()
    async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
        try {
            const user = req.user as any;
            if (!user) {
                throw new UnauthorizedException('Google authentication failed');
            }

            // Find or create user based on Google profile
            const dbUser = await this.authService.findOrCreateUserByOAuth({
                email: user.email,
                name: user.name,
                googleId: user.googleId,
            });

            const access_token = await this.authService.generateToken(dbUser);
            const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3005';

            // Redirect to frontend with token
            res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
        } catch (error) {
            const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3005';
            res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        }
    }
}
