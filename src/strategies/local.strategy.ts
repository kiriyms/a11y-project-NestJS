import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserDataDto } from 'src/modules/auth/dto/user-data.dto';
import { StrategiesVerificationService } from 'src/modules/strategies-verification/strategies-verification.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly strategiesVerificationService: StrategiesVerificationService,
  ) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<UserDataDto> {
    return await this.strategiesVerificationService.validateUserLocal({
      email,
      password,
    });
  }
}
