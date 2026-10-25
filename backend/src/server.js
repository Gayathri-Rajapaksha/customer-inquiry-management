const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log('----------------------------------------------------');
  console.log(`[Backend] Server listening on http://localhost:${config.port}`);
  console.log(`[Backend] Environment: ${config.nodeEnv}`);
  console.log(`[Backend] Health check: http://localhost:${config.port}/api/health`);
  console.log('----------------------------------------------------');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Backend] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[Backend] HTTP server closed');
  });
});
