import { config } from './config.js';
import { db } from './db/database.js';
import { createServer } from './server.js';

async function bootstrap() {
  try {
    console.log('Initializing database...');
    await db.init();

    const { server } = createServer();

    server.listen(config.port, config.host, () => {
      console.log(`=================================================`);
      console.log(`Game Server Tien Len Mien Bac Online is running!`);
      console.log(`Port: ${config.port}`);
      console.log(`Origin: ${config.appOrigin}`);
      console.log(`Mode: ${config.nodeEnv}`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
