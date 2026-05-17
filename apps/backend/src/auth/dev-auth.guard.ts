
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DevAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // In development, if no user is found (missing or invalid token),
    // we bypass authentication and return a mock user to allow dashboard access.
    if (process.env.NODE_ENV !== 'production' && !user) {
      return {
        id: "74a2fd06-786e-4d37-ae72-ac54528f969e",
        email: "testuser123@example.com",
        organizationId: "de6dc789-c5d8-42a4-8cfb-e991b50962a2",
        role: "FOUNDER"
      };
    }
    
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
