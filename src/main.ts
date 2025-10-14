import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'fatal'],
    rawBody: true,
  });
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://a11y-project-steel.vercel.app',
      'https://mozilla.github.io',
    ],
  });

  await app.listen(process.env.PORT ?? 3000);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
