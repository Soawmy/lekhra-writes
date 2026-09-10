const fs = require('fs');
const path = require('path');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'REPLACE_WITH_YOUR_UPSTASH_REST_URL';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'REPLACE_WITH_YOUR_UPSTASH_REST_TOKEN';

const LOCAL_DB_PATH = path.join(__dirname, '..', '..', '.local_db.json');

function readLocalDb() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function localRedis(command) {
  const db = readLocalDb();
  const cmd = (command[0] || '').toUpperCase();
  const key = command[1];

  if (cmd === 'LRANGE') {
    const list = Array.isArray(db[key]) ? db[key] : [];
    const start = parseInt(command[2], 10) || 0;
    const stop = parseInt(command[3], 10);
    if (stop === -1 || isNaN(stop)) return list.slice(start);
    return list.slice(start, stop + 1);
  }
  if (cmd === 'LPUSH') {
    if (!Array.isArray(db[key])) db[key] = [];
    db[key].unshift(command[2]);
    writeLocalDb(db);
    return db[key].length;
  }
  if (cmd === 'LTRIM') {
    if (Array.isArray(db[key])) {
      const start = parseInt(command[2], 10) || 0;
      const stop = parseInt(command[3], 10);
      db[key] = (stop === -1 || isNaN(stop)) ? db[key].slice(start) : db[key].slice(start, stop + 1);
      writeLocalDb(db);
    }
    return 'OK';
  }
  if (cmd === 'LREM') {
    if (Array.isArray(db[key])) {
      const val = command[3];
      db[key] = db[key].filter((item) => item !== val);
      writeLocalDb(db);
    }
    return 1;
  }
  if (cmd === 'GET') {
    return db[key] != null ? db[key] : null;
  }
  if (cmd === 'SET') {
    db[key] = command[2];
    writeLocalDb(db);
    return 'OK';
  }
  if (cmd === 'SMEMBERS') {
    return Array.isArray(db[key]) ? db[key] : [];
  }
  if (cmd === 'SADD') {
    if (!Array.isArray(db[key])) db[key] = [];
    if (!db[key].includes(command[2])) db[key].push(command[2]);
    writeLocalDb(db);
    return 1;
  }
  if (cmd === 'SREM') {
    if (Array.isArray(db[key])) {
      db[key] = db[key].filter((item) => item !== command[2]);
      writeLocalDb(db);
    }
    return 1;
  }
  return null;
}

async function redis(command) {
  const isUpstashConfigured =
    UPSTASH_URL &&
    UPSTASH_TOKEN &&
    !UPSTASH_URL.startsWith('REPLACE_WITH') &&
    !UPSTASH_TOKEN.startsWith('REPLACE_WITH');

  if (!isUpstashConfigured) {
    return localRedis(command);
  }

  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    });

    const data = await res.json();
    if (data.error) {
      throw new Error('Upstash error: ' + data.error);
    }
    return data.result;
  } catch (err) {
    console.warn('Upstash Redis error, falling back to local storage:', err.message);
    return localRedis(command);
  }
}

module.exports = { redis };
