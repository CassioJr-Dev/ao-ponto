import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { isLocalNetworkAddress } from './atendimento/local-network.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === frontendOrigin) {
        callback(null, true);
        return;
      }
      try {
        const hostname = new URL(origin).hostname.replace(/^\[|\]$/g, '');
        const localOrigin =
          hostname === 'localhost' || isLocalNetworkAddress(hostname);
        callback(
          localOrigin ? null : new Error('Origin is not allowed by CORS'),
          localOrigin,
        );
      } catch {
        callback(new Error('Origin is not allowed by CORS'), false);
      }
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AO PONTO API')
    .setDescription(
      'API do totem para consultar cortes disponíveis e registrar pedidos. O pedido e a senha são persistidos na mesma transação PostgreSQL.',
    )
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
