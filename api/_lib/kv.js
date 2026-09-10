const store = new Map();

async function redis(command) {
  const [cmd, key, ...args] = command;

  const k = key;
  if (cmd.toUpperCase() === 'GET') {
    return store.get(k) || null;
  }
  if (cmd.toUpperCase() === 'SET') {
    store.set(k, args[0]);
    return 'OK';
  }
  if (cmd.toUpperCase() === 'DEL') {
    store.delete(k);
    return 1;
  }
  if (cmd.toUpperCase() === 'INCR') {
    const n = (store.get(k) || 0) + 1;
    store.set(k, n);
    return n;
  }
  if (cmd.toUpperCase() === 'LPUSH') {
    let arr = store.get(k) || [];
    arr.unshift(args[0]);
    store.set(k, arr);
    return arr.length;
  }
  if (cmd.toUpperCase() === 'LTRIM') {
    let arr = store.get(k) || [];
    arr = arr.slice(parseInt(args[0]), parseInt(args[1]) + 1);
    store.set(k, arr);
    return 'OK';
  }
  if (cmd.toUpperCase() === 'LRANGE') {
    let arr = store.get(k) || [];
    return arr.slice(parseInt(args[0]), parseInt(args[1]) + 1);
  }

  if (cmd.toUpperCase() === 'LREM') {
    let arr = store.get(k) || [];
    const value = args[1];
    const newArr = arr.filter(el => el !== value);
    store.set(k, newArr);
    return arr.length - newArr.length;
  }

  return null;
}

module.exports = { redis };
