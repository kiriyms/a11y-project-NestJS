/* eslint-disable @typescript-eslint/require-await */
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { AccessTokenDto } from './dto/access-token.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayloadDto } from '../auth/dto/jwt-payload.dto';
import { ResetPasswordTokenDto } from './dto/reset-password-token.dto';

@Injectable()
export class TokenGenerationService {
  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(userId: string): Promise<AccessTokenDto> {
    const payload: JwtPayloadDto = {
      sub: userId,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN,
      secret: process.env.JWT_SECRET,
    });

    return { accessToken: token };
  }

  async generateRefreshToken(userId: string): Promise<RefreshTokenDto> {
    const payload: JwtPayloadDto = {
      sub: userId,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
      secret: process.env.JWT_REFRESH_SECRET,
    });

    return { refreshToken: token };
  }

  async generateVerifyToken(userId: string): Promise<VerifyTokenDto> {
    const payload: JwtPayloadDto = {
      sub: userId,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_VERIFY_EXPIRES_IN,
      secret: process.env.JWT_VERIFY_SECRET,
    });

    return { verifyToken: token };
  }

  async generateResetPasswordToken(
    userId: string,
  ): Promise<ResetPasswordTokenDto> {
    const payload: JwtPayloadDto = {
      sub: userId,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_RESET_PASSWORD_EXPIRES_IN,
      secret: process.env.JWT_RESET_PASSWORD_SECRET,
    });

    return { resetPasswordToken: token };
  }
}
