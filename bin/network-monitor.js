#!/usr/bin/env node
const {
  diffSnapshots,
  filterInterfaces,
  formatReport,
  getTrafficSnapshot,
  knownInterfaceNames,
  sleep,
} = require('../src/monitor');

function printHelp() {
  console.log(`Usage: network-monitor [options]

Monitor network traffic counters using only Node.js built-in modules.

Options:
  -i, --interval <seconds>   Seconds between samples (default: 1)
  -n, --count <samples>      Number of reports to print (default: unlimited)
      --interfaces <names>   Comma-separated interface names to include
      --json                 Print newline-delimited JSON instead of a table
      --list                 List detected network interface names
  -h, --help                 Show this help message`);
}

function parseArgs(argv) {
  const options = {
    interval: 1,
    count: Infinity,
    interfaces: [],
    json: false,
    list: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--list') {
      options.list = true;
    } else if (arg === '-i' || arg === '--interval') {
      index += 1;
      options.interval = Number(argv[index]);
    } else if (arg === '-n' || arg === '--count') {
      index += 1;
      options.count = Number(argv[index]);
    } else if (arg === '--interfaces') {
      index += 1;
      options.interfaces = argv[index].split(',').map((name) => name.trim()).filter(Boolean);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isFinite(options.interval) || options.interval <= 0) {
    throw new Error('Interval must be a positive number of seconds.');
  }

  if ((!Number.isFinite(options.count) && options.count !== Infinity) || options.count <= 0) {
    throw new Error('Count must be a positive number.');
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.list) {
    console.log(knownInterfaceNames().join('\n'));
    return;
  }

  let previous = filterInterfaces(await getTrafficSnapshot(), options.interfaces);
  let printed = 0;

  while (printed < options.count) {
    await sleep(options.interval * 1000);
    const current = filterInterfaces(await getTrafficSnapshot(), options.interfaces);
    const samples = diffSnapshots(previous, current, options.interval);

    if (options.json) {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), samples }));
    } else {
      console.log(formatReport(samples));
      if (printed + 1 < options.count) console.log('');
    }

    previous = current;
    printed += 1;
  }
}

main().catch((error) => {
  console.error(`network-monitor: ${error.message}`);
  process.exitCode = 1;
});
