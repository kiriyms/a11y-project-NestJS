import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtVerifyAuthGuard extends AuthGuard('jwt-verify') {}
