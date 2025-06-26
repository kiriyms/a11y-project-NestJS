/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as argon2 from 'argon2';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TokenPairDto } from './dto/token-pair.dto';
import { ResendService } from 'nestjs-resend';
import { RegisterDataDto } from './dto/register-data.dto';
import { TokenGenerationService } from '../token-generation/token-generation.service';
import { ResetPasswordDataDto } from './dto/reset-password-data.dto';
import { UserDataDto } from './dto/user-data.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly resendService: ResendService,
    private readonly tokenGenerationService: TokenGenerationService,
  ) {}

  private async overrideSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    try {
      const accessTokenHash = await argon2.hash(accessToken);
      const refreshTokenHash = await argon2.hash(refreshToken);

      await this.databaseService.overrideSession(
        userId,
        accessTokenHash,
        refreshTokenHash,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `failed to override session: ${error}`,
      );
    }
  }

  async register(data: RegisterDataDto): Promise<TokenPairDto> {
    try {
      const registerPasswordHash = await argon2.hash(data.password);
      const user = await this.databaseService.createUser(
        data.email,
        registerPasswordHash,
        false,
        false,
      );
      const { passwordHash, ...userDto } = user;

      const { verifyToken } =
        await this.tokenGenerationService.generateVerifyToken(userDto.id);
      const tokenHash = await argon2.hash(verifyToken);
      await this.databaseService.overrideVerificationToken(
        userDto.id,
        tokenHash,
      );

      await this.resendService.send({
        from: 'no-reply@a11y-server.xyz',
        to: userDto.email,
        subject: 'A11yReport Email Verification',
        text: `Please verify your email by clicking the link:\n\n${process.env.VERIFICATION_CALLBACK_URL}?verificationToken=${verifyToken}`,
      });

      const { accessToken } =
        await this.tokenGenerationService.generateAccessToken(userDto.id);
      const { refreshToken } =
        await this.tokenGenerationService.generateRefreshToken(userDto.id);

      await this.overrideSession(userDto.id, accessToken, refreshToken);

      return { accessToken, refreshToken };
    } catch (error) {
      throw new InternalServerErrorException(
        `failed to register new user: ${error}`,
      );
    }
  }

  async verify(userId: string): Promise<boolean> {
    const user = await this.databaseService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    await this.databaseService.updateUserIsVerified(userId, true);
    return true;
  }

  async resendVerification(userId: string): Promise<boolean> {
    try {
      const { verifyToken } =
        await this.tokenGenerationService.generateVerifyToken(userId);

      const user = await this.databaseService.getUserById(userId);
      if (!user) {
        throw new NotFoundException('user not found');
      }

      console.log(
        `userId: ${userId}, userEmail: ${user.email}, verifyToken: ${verifyToken}`,
      );

      const tokenHash = await argon2.hash(verifyToken);
      await this.databaseService.overrideVerificationToken(userId, tokenHash);

      await this.resendService.send({
        from: 'no-reply@a11y-server.xyz',
        to: user.email,
        subject: 'A11yReport Email Verification',
        text: `Please verify your email by clicking the link:\n\n${process.env.VERIFICATION_CALLBACK_URL}?verificationToken=${verifyToken}`,
      });

      return true;
    } catch (error) {
      throw new InternalServerErrorException(
        `failed to override verification token: ${error}`,
      );
    }
  }

  async login(userId: string): Promise<TokenPairDto> {
    const { accessToken } =
      await this.tokenGenerationService.generateAccessToken(userId);
    const { refreshToken } =
      await this.tokenGenerationService.generateRefreshToken(userId);
    await this.overrideSession(userId, accessToken, refreshToken);
    return { accessToken, refreshToken };
  }

  async refresh(userId: string): Promise<TokenPairDto> {
    const { accessToken } =
      await this.tokenGenerationService.generateAccessToken(userId);
    const { refreshToken } =
      await this.tokenGenerationService.generateRefreshToken(userId);
    await this.overrideSession(userId, accessToken, refreshToken);
    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<boolean> {
    await this.databaseService.deleteSession(userId);
    return true;
  }

  async googleCallback(userId: string): Promise<TokenPairDto> {
    const { accessToken } =
      await this.tokenGenerationService.generateAccessToken(userId);
    const { refreshToken } =
      await this.tokenGenerationService.generateRefreshToken(userId);
    await this.overrideSession(userId, accessToken, refreshToken);
    return { accessToken, refreshToken };
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      const user = await this.databaseService.getUserByEmail(email);
      if (!user) {
        // log the error but don't throw an exception to avoid leaking user data
        return true;
      }

      const { resetPasswordToken } =
        await this.tokenGenerationService.generateResetPasswordToken(user.id);
      const tokenHash = await argon2.hash(resetPasswordToken);
      await this.databaseService.overrideResetPasswordToken(user.id, tokenHash);

      await this.resendService.send({
        from: 'no-reply@a11y-server.xyz',
        to: user.email,
        subject: 'A11yReport Password Reset',
        text: `Password reset was requested for this account.\nIf this wasn't you, you can ignore this email.\nTo reset the password, please follow this link:\n\n${process.env.RESET_PASSWORD_CALLBACK_URL}?resetPasswordToken=${resetPasswordToken}`,
      });

      return true;
    } catch (error) {
      return true;
    }
  }

  async resetPasswordCallback(
    userId: string,
    passwords: ResetPasswordDataDto,
  ): Promise<boolean> {
    try {
      const user = await this.databaseService.getUserById(userId);
      if (!user) {
        throw new NotFoundException('user not found');
      }

      const passwordHash = await argon2.hash(passwords.password);
      await this.databaseService.updateUserPasswordHash(user.id, passwordHash);

      console.log(
        `old password hash: ${user.passwordHash}; new hash: ${passwordHash}`,
      );

      return true;
    } catch (error) {
      throw new InternalServerErrorException(
        `failed to reset password: ${error}`,
      );
    }
  }

  async profileInfo(userId: string): Promise<UserDataDto> {
    const user = await this.databaseService.getUserById(userId);
    if (!user) {
      throw new NotFoundException(
        `profileInfo for user id '${userId}' not found`,
      );
    }

    const { passwordHash, ...userDto } = user;
    return userDto;
  }

  async subscribePremium(userId: string): Promise<any> {
    const user = await this.databaseService.getUserById(userId);
    if (!user) {
      throw new NotFoundException(
        `Data to subscribe for user id '${userId}' not found`,
      );
    }

    if (!process.env.STRIPE_TEST_SK) {
      throw new InternalServerErrorException('Stripe secret key not set');
    }

    if (!process.env.STRIPE_SUBSCRIPTION_PRICE_ID) {
      throw new InternalServerErrorException(
        'Stripe subscription price ID key not set',
      );
    }

    const stripe = require('stripe')(process.env.STRIPE_TEST_SK);

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
      });

      if (!customer.id || typeof customer.id !== 'string') {
        throw new InternalServerErrorException(
          'New Customer ID is not a string or is missing',
        );
      }

      await this.databaseService.updateUserStripeCustomerId(
        user.id,
        customer.id,
      );

      user.stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        { price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID, quantity: 1 },
      ],
      customer: user.stripeCustomerId,
      metadata: {
        userId: user.id,
        userEmail: user.email,
      },
      success_url: `${process.env.FRONTEND_URL}/profile/success`,
      cancel_url: `${process.env.FRONTEND_URL}/profile/cancel`,
      mode: 'subscription',
    });

    return session.url;
  }

  async handleStripeWebhook(stripeSignature: string, body): Promise<void> {
    const stripe = require('stripe')(process.env.STRIPE_TEST_SK);

    if (!stripeSignature || !body) {
      throw new UnauthorizedException('Stripe signature or body not found');
    }

    try {
      const event = await stripe.webhooks.constructEvent(
        body,
        stripeSignature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
      console.log(`Stripe event type: ${JSON.stringify(event.type)}`);

      switch (event.type) {
        case 'checkout.session.completed': {
          console.log(
            `checkout.session.completed event: ${JSON.stringify(event.data.object.subscription)}`,
          );
          console.log(
            `checkout.session.completed event: ${JSON.stringify(event.data.object.metadata.userId)}`,
          );
          console.log(
            `checkout.session.completed event: ${JSON.stringify(event.data.object.metadata.userEmail)}\n`,
          );
          const user = await this.databaseService.getUserById(
            event.data.object.metadata.userId,
          );

          if (!user) {
            console.log(
              `Stripe metadata user error: User with ID ${event.data.object.metadata.userId} not found`,
            );
            throw new UnauthorizedException(
              `User with ID ${event.data.object.metadata.userId} not found`,
            );
          }

          if (user.email !== event.data.object.metadata.userEmail) {
            console.log(
              `Stripe metadata user email mismatch: (metadata)${event.data.object.metadata.userEmail}, (database) ${user.email}`,
            );
            throw new UnauthorizedException(
              `Stripe metadata user email mismatch`,
            );
          }

          await this.databaseService.updateUserStripeSubscriptionId(
            user.id,
            event.data.object.subscription,
          );
          await this.databaseService.updateUserSubscriptionStatus(
            user.id,
            'PREMIUM',
          );

          console.log(
            `Adding PREMIUM subscription (${event.data.object.subscription}) to user ${user.email}`,
          );

          break;
        }

        case 'customer.subscription.updated': {
          console.log(
            `customer.subscription.updated event: ${JSON.stringify(event.data.object.id)}`,
          );
          console.log(
            `customer.subscription.updated event: ${JSON.stringify(event.data.object.status)}\n`,
          );
          const user = await this.databaseService.getUserByStrpeSubscriptionId(
            event.data.object.id,
          );

          if (!user) {
            console.log(
              `Stripe metadata user error: User for subscription ID ${event.data.object.id} not found`,
            );
            throw new UnauthorizedException(
              `User with subscription ID ${event.data.object.id} not found`,
            );
          }

          if (event.data.object.status === 'active') {
            await this.databaseService.updateUserSubscriptionStatus(
              user.id,
              'PREMIUM',
            );

            console.log(
              `[Sub update] Adding PREMIUM subscription to user ${user.email}`,
            );
          } else {
            await this.databaseService.updateUserSubscriptionStatus(
              user.id,
              'BASE',
            );

            console.log(
              `[Sub update] Removing PREMIUM subscription from user ${user.email}`,
            );
          }

          break;
        }

        case 'customer.subscription.deleted': {
          console.log(
            `customer.subscription.deleted event: ${JSON.stringify(event.data.object.id)}`,
          );
          console.log(
            `customer.subscription.deleted event: ${JSON.stringify(event.data.object.status)}\n`,
          );
          const user = await this.databaseService.getUserByStrpeSubscriptionId(
            event.data.object.id,
          );

          if (!user) {
            console.log(
              `Stripe metadata user error: User for subscription ID ${event.data.object.id} not found`,
            );
            throw new UnauthorizedException(
              `User with subscription ID ${event.data.object.id} not found`,
            );
          }

          await this.databaseService.updateUserSubscriptionStatus(
            user.id,
            'BASE',
          );

          console.log(
            `[Sub update] Removing PREMIUM subscription from user ${user.email}`,
          );

          break;
        }
      }
    } catch (err) {
      console.log(`error constructing Stripe event:--${err.message}--\n`);
      throw new UnauthorizedException('Invalid Stripe Signature');
    }
  }
}
