const redis = require('redis'); // will need to install redis package
const config = require('./index');

// Placeholder for future Redis integration – currently unused
const client = config.redisUrl
  ? redis.createClient({ url: config.redisUrl })
  : null;

if (client) {
  client.on('error', (err) => console.error('Redis Client Error', err));
  client.connect();
}

module.exports = client;
