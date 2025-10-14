import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtVerifyPayloadDto } from 'src/modules/auth/dto/jwt-verify-payload.dto';
import { StrategiesVerificationService } from 'src/modules/strategies-verification/strategies-verification.service';

@Injectable()
export class JwtResetPasswordStrategy extends PassportStrategy(
  Strategy,
  'jwt-reset-password',
) {
  constructor(
    private readonly strategiesVerificationService: StrategiesVerificationService,
  ) {
    const jwtSecret = process.env.JWT_RESET_PASSWORD_SECRET;
    if (jwtSecret === undefined) {
      throw new Error(
        'JWT_RESET_PASSWORD_SECRET is not defined in the environment variables',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtVerifyPayloadDto,
  ): Promise<JwtVerifyPayloadDto> {
    const resetPasswordToken = req.headers.authorization?.split(' ')[1];
    if (!resetPasswordToken) {
      throw new UnauthorizedException(
        'verify token not found in request query',
      );
    }
    // console.log(`JWT Reset Password Guard got reset password token: ${resetPasswordToken}`)

    await this.strategiesVerificationService.validateUserJwtResetPassword(
      payload.sub,
      resetPasswordToken,
    );
    return payload;
  }
}
