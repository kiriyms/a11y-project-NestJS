import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayloadDto } from 'src/modules/auth/dto/jwt-payload.dto';
import { Request } from 'express';
import { StrategiesVerificationService } from 'src/modules/strategies-verification/strategies-verification.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly strategiesVerificationService: StrategiesVerificationService,
  ) {
    const jwtSecret = process.env.JWT_REFRESH_SECRET;
    if (jwtSecret === undefined) {
      throw new Error(
        'JWT_REFRESH_SECRET is not defined in the environment variables',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayloadDto): Promise<JwtPayloadDto> {
    const refreshToken = req.headers.authorization?.split(' ')[1];
    if (!refreshToken) {
      throw new UnauthorizedException(
        'access token not found in request headers',
      );
    }
    // console.log(`JWT refresh Guard got refresh token: ${refreshToken}`)

    // console.log(`[SUB]: ${JSON.stringify(payload)}`)
    await this.strategiesVerificationService.validateUserJwtRefresh(
      payload.sub,
      refreshToken,
    );
    return payload;
  }
}
