import { createClient } from 'redis';

export const redisClient = createClient({
  password: 'sbnpgA8OwzieIsykl2aZkgf61KGDjeUy',
  socket: {
    host: 'redis-16231.c322.us-east-1-2.ec2.cloud.redislabs.com',
    port: 16231,
  },
}).on('error', (err) => {
  throw err;
});
