import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import express from 'express';
import { AppModule } from './app.module.js';
import { validateEnv } from './config/env.js';
import { runMigrations } from './database/migrate.js';

async function bootstrap() {
  const env = validateEnv();

  await runMigrations();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(
    '/v1/internal/uploads/image',
    express.raw({ type: 'image/*', limit: '25mb' }),
  );

  const origins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    maxAge: 3600,
  });

  app.enableShutdownHooks();

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Peja API')
      .setDescription('Peja API')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(env.PORT);

  const logger = app.get(Logger);
  logger.log(`Peja API running on port ${env.PORT} [${env.NODE_ENV}]`);
}

void bootstrap();
