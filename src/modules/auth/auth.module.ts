import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from 'src/strategies/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtAccessStrategy } from 'src/strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from 'src/strategies/jwt-refresh.strategy';
import { GoogleStrategy } from 'src/strategies/google.strategy';
import { JwtVerifyStrategy } from 'src/strategies/jwt-verify.strategy';
import { TokenGenerationService } from '../token-generation/token-generation.service';
import { JwtResetPasswordStrategy } from 'src/strategies/jwt-reset-password.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    JwtVerifyStrategy,
    JwtResetPasswordStrategy,
    GoogleStrategy,
    TokenGenerationService,
  ],
})
export class AuthModule {}
