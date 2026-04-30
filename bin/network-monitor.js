#!/usr/bin/env node
const {
  diffSnapshots,
  filterInterfaces,
  formatReport,
  getTrafficSnapshot,
  knownInterfaceNames,
  sleep,
} = require('../src/monitor');
const { parseArgs } = require('../src/cli');
const pkg = require('../package.json');

function printHelp() {
  console.log(`Usage: network-monitor [options]

Monitor network traffic counters using only Node.js built-in modules.

Options:
  -i, --interval <seconds>   Seconds between samples (default: 1)
  -n, --count <samples>      Number of reports to print (default: unlimited)
      --interfaces <names>   Comma-separated interface names to include
      --json                 Print newline-delimited JSON instead of a table
      --list                 List detected network interface names
  -v, --version              Show version
  -h, --help                 Show this help message`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.version) {
    console.log(pkg.version);
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
