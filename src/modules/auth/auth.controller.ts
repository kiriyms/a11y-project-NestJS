/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Post,
  UseGuards,
  HttpStatus,
  HttpCode,
  Get,
  Delete,
  Response,
  Body,
  Patch,
  Headers,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { Request as NestRequest } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenPairDto } from './dto/token-pair.dto';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { JwtRefreshAuthGuard } from 'src/guards/jwt-refresh-auth.guard';
import { GoogleAuthGuard } from 'src/guards/google-auth.guard';
import { Public } from 'src/decorators/public.decorator';
import { RegisterDataDto } from './dto/register-data.dto';
import { JwtVerifyAuthGuard } from 'src/guards/jwt-verify-auth.guard';
import { ResetPasswordDataDto } from './dto/reset-password-data.dto';
import { ResetPasswordEmailDataDto } from './dto/reset-password-email-data.dto';
import { JwtResetPasswordAuthGuard } from 'src/guards/jwt-reset-password-auth.guard';
import { UserDataDto } from './dto/user-data.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('confirm-token')
  async confirmToken(): Promise<boolean> {
    return true;
  }

  @Public()
  @Post('register')
  async register(@Body() data: RegisterDataDto): Promise<TokenPairDto> {
    console.log(`register data: ${JSON.stringify(data)}`);
    return await this.authService.register(data);
  }

  @Public()
  @UseGuards(JwtVerifyAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('verify/callback')
  async verifyCallback(@NestRequest() req, @Response() res): Promise<void> {
    console.log(`verify user: ${JSON.stringify(req.user)}`);
    await this.authService.verify(req.user.sub);
    res.redirect(`${process.env.FRONTEND_URL}/verify/callback`);
  }

  @Get('verify/resend')
  async resendVerification(@NestRequest() req): Promise<boolean> {
    console.log(`resendVerification user: ${JSON.stringify(req.user)}`);
    return await this.authService.resendVerification(req.user.sub);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@NestRequest() req): Promise<TokenPairDto> {
    console.log(`login user: ${JSON.stringify(req.user)}`);
    return await this.authService.login(req.user.id);
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@NestRequest() req): Promise<TokenPairDto> {
    console.log(`refresh user: ${JSON.stringify(req.user)}`);
    return await this.authService.refresh(req.user.sub);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('logout')
  async logout(@NestRequest() req): Promise<boolean> {
    console.log(`logout user: ${JSON.stringify(req.user)}`);
    return await this.authService.logout(req.user.sub);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  async googleAuth(): Promise<void> {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@NestRequest() req, @Response() res): Promise<void> {
    console.log(`googleCallback user: ${JSON.stringify(req.user)}`);
    const tokenPair = await this.authService.googleCallback(req.user.id);
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?accessToken=${tokenPair.accessToken}&refreshToken=${tokenPair.refreshToken}`,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  async resetPassword(
    @Body() data: ResetPasswordEmailDataDto,
  ): Promise<boolean> {
    console.log(`reset password data: ${JSON.stringify(data)}`);
    return await this.authService.resetPassword(data.email);
  }

  @Public()
  @UseGuards(JwtResetPasswordAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch('password/reset/callback')
  async resetPasswordCallback(
    @NestRequest() req,
    @Body() data: ResetPasswordDataDto,
  ): Promise<boolean> {
    console.log(`reset password callback user: ${JSON.stringify(req.user)}`);
    return await this.authService.resetPasswordCallback(req.user.sub, data);
  }

  @HttpCode(HttpStatus.OK)
  @Get('profile-info')
  async profileInfo(@NestRequest() req): Promise<UserDataDto> {
    console.log(`profileInfo user: ${JSON.stringify(req.user)}`);
    return await this.authService.profileInfo(req.user.sub);
  }

  @HttpCode(HttpStatus.OK)
  @Post('subscribe-premium')
  async subscribePremium(@NestRequest() req): Promise<any> {
    console.log(`profileInfo user: ${JSON.stringify(req.user)}`);
    return await this.authService.subscribePremium(req.user.sub);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('stripe-webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') stripeSignature,
  ): Promise<void> {
    const body = req.rawBody;
    await this.authService.handleStripeWebhook(stripeSignature, body);
  }
}
