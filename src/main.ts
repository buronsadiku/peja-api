import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { validateEnv } from './config/env.js';
import { runMigrations } from './database/migrate.js';

async function bootstrap() {
  const env = validateEnv();

  // Apply pending Drizzle migrations before the app starts serving.
  // Crashes here are loud and intentional — never start half-migrated.
  await runMigrations();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(cookieParser());

  const origins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    maxAge: 3600,
  });

  app.enableShutdownHooks();

  // Swagger
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Peja API')
      .setDescription('Wedding guestbook platform API')
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your Supabase Auth JWT token',
      })
      .addTag('Auth', 'Authentication and user management')
      .addTag('Events', 'Wedding event management')
      .addTag('Messages', 'Guest message management')
      .addTag('Public', 'Guest-facing endpoints (no auth required)')
      .addTag('Payments', 'Checkout and payment management')
      .addTag('Orders', 'Order listing and refunds')
      .addTag('Webhooks', 'Payment provider webhooks')
      .addTag('Keepsakes', 'Keepsake catalog and previews')
      .addTag('Invitations', 'Invitation tracking and analytics')
      .addTag('Jobs', 'Background job status')
      .addTag('Admin', 'Admin-only endpoints')
      .addTag('Health', 'Health and readiness checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(env.PORT);

  const logger = app.get(Logger);
  logger.log(`Peja API running on port ${env.PORT} [${env.NODE_ENV}]`);
}

void bootstrap();
