import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayloadDto } from 'src/modules/auth/dto/jwt-payload.dto';
import { Request } from 'express';
import { StrategiesVerificationService } from 'src/modules/strategies-verification/strategies-verification.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    private readonly strategiesVerificationService: StrategiesVerificationService,
  ) {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret === undefined) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayloadDto): Promise<JwtPayloadDto> {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      throw new UnauthorizedException(
        'access token not found in request headers',
      );
    }
    // console.log(`JWT Access Guard got access token: ${accessToken}`)

    await this.strategiesVerificationService.validateUserJwtAccess(
      payload.sub,
      accessToken,
    );
    return payload;
  }
}
