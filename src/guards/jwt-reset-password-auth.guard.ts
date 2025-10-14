import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtResetPasswordAuthGuard extends AuthGuard(
  'jwt-reset-password',
) {}
