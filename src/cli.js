const KNOWN_FLAGS = new Set([
  '-h',
  '--help',
  '-v',
  '--version',
  '--json',
  '--list',
  '-i',
  '--interval',
  '-n',
  '--count',
  '--interfaces',
]);

function readValue(argv, index, flag) {
  const next = argv[index];
  if (next === undefined || KNOWN_FLAGS.has(next)) {
    throw new Error(`Option ${flag} requires a value.`);
  }
  return next;
}

function parsePositiveNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Option ${flag} must be a positive number, received: ${value}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    interval: 1,
    count: Infinity,
    interfaces: [],
    json: false,
    list: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--list') {
      options.list = true;
    } else if (arg === '-i' || arg === '--interval') {
      index += 1;
      options.interval = parsePositiveNumber(readValue(argv, index, arg), arg);
    } else if (arg === '-n' || arg === '--count') {
      index += 1;
      options.count = parsePositiveNumber(readValue(argv, index, arg), arg);
    } else if (arg === '--interfaces') {
      index += 1;
      const value = readValue(argv, index, arg);
      options.interfaces = value
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      if (options.interfaces.length === 0) {
        throw new Error('Option --interfaces requires at least one interface name.');
      }
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

module.exports = { parseArgs };
