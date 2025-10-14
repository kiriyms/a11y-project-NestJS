/* eslint-disable @typescript-eslint/no-unused-vars */
import * as argon2 from 'argon2';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleUserDataDto } from '../auth/dto/google-user-data.dto';
import { LoginDataDto } from '../auth/dto/login-data.dto';
import { UserDataDto } from '../auth/dto/user-data.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StrategiesVerificationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async validateUserLocal(data: LoginDataDto): Promise<UserDataDto> {
    // add isVerified check here OR create decorator

    const user = await this.databaseService.getUserByEmail(data.email);
    if (!user) {
      throw new NotFoundException('user with provided email not found');
      // Also log this
    }

    if (user.isOAuth) {
      throw new UnauthorizedException('user registered with OAuth provider');
      // Also log this
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('user password not set');
      // Also log this
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      data.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('wrong password');
      // Also log this
    }

    const { passwordHash, ...userDto } = user;
    return userDto as UserDataDto;
  }

  async validateUserGoogle(
    userGoogle: GoogleUserDataDto,
  ): Promise<UserDataDto> {
    const emailGoogle = userGoogle.emails[0].value;
    if (!emailGoogle) {
      throw new InternalServerErrorException(
        'email not provided by google OAuth',
      );
    }

    const user = await this.databaseService.getUserByEmail(emailGoogle);
    if (user) {
      const { passwordHash, ...userDto } = user;
      return userDto as UserDataDto;
    }

    const newUser = await this.databaseService.createUser(
      emailGoogle,
      null,
      true,
      true,
    );
    const { passwordHash, ...userDto } = newUser;
    return userDto as UserDataDto;
  }

  async validateUserJwtAccess(
    userId: string,
    accessToken: string,
  ): Promise<void> {
    const session = await this.databaseService.getSessionByUserId(userId);
    if (!session) {
      throw new NotFoundException('session not found');
    }

    const isAccessTokenValid = await argon2.verify(
      session.accessTokenHash,
      accessToken,
    );
    if (!isAccessTokenValid) {
      throw new UnauthorizedException('access token is invalid');
    }
  }

  async validateUserJwtRefresh(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const session = await this.databaseService.getSessionByUserId(userId);
    if (!session) {
      throw new NotFoundException('session not found');
    }

    const isRefreshTokenValid = await argon2.verify(
      session.refreshTokenHash,
      refreshToken,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('refresh token is invalid');
    }
  }

  async validateUserJwtVerify(
    userId: string,
    verifyToken: string,
  ): Promise<void> {
    const verificationToken =
      await this.databaseService.getVerificationTokenByUserId(userId);
    if (!verificationToken) {
      throw new NotFoundException('verification token not found');
    }

    const isVerificationTokenValid = await argon2.verify(
      verificationToken.tokenHash,
      verifyToken,
    );
    if (!isVerificationTokenValid) {
      throw new UnauthorizedException('verification token is invalid');
    }
  }

  async validateUserJwtResetPassword(
    userId: string,
    resetPasswordToken: string,
  ): Promise<void> {
    const resetToken =
      await this.databaseService.getResetPasswordTokenByUserId(userId);
    if (!resetToken) {
      throw new NotFoundException('reset password token not found');
    }

    const isResetPasswordTokenValid = await argon2.verify(
      resetToken.tokenHash,
      resetPasswordToken,
    );
    if (!isResetPasswordTokenValid) {
      throw new UnauthorizedException('reset password token is invalid');
    }
  }
}
