import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests from any localhost port (dev) or configured frontend URL
      const allowed = !origin ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        origin === process.env.FRONTEND_URL;
      callback(null, allowed);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`FreelancePro API running on http://localhost:${port}`);
}
bootstrap();
