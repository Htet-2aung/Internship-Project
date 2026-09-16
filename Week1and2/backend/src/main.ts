import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
// Load the application module at runtime so projects that resolve modules
// outside TypeScript's declaration lookup can still start the Nest app.
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS so the React frontend can communicate with this API
  app.enableCors({
    origin: 'http://localhost:5173', // Your Vite dev server URL
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();