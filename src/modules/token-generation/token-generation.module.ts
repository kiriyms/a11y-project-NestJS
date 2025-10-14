import { Module } from '@nestjs/common';
import { TokenGenerationService } from './token-generation.service';

@Module({
  providers: [TokenGenerationService],
  exports: [TokenGenerationService],
})
export class TokenGenerationModule {}
