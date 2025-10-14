import { Global, Module } from '@nestjs/common';
import { StrategiesVerificationService } from './strategies-verification.service';

@Global()
@Module({
  providers: [StrategiesVerificationService],
  exports: [StrategiesVerificationService],
})
export class StrategiesVerificationModule {}
