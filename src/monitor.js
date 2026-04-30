const fs = require('fs/promises');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const LINUX_PROC_NET_DEV_FIELD_COUNT = 16;

function parseLinuxProcNetDev(contents) {
  const interfaces = [];

  for (const line of contents.split('\n').slice(2)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;

    const name = trimmed.slice(0, separator).trim();
    const fields = trimmed
      .slice(separator + 1)
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));

    if (fields.length < LINUX_PROC_NET_DEV_FIELD_COUNT || fields.some((value) => Number.isNaN(value))) continue;

    interfaces.push({
      name,
      rxBytes: fields[0],
      rxPackets: fields[1],
      txBytes: fields[8],
      txPackets: fields[9],
    });
  }

  return interfaces;
}

function parseDarwinNetstat(contents) {
  const totals = new Map();
  const header = contents
    .split('\n')
    .find((line) => /^Name\s+/.test(line));

  if (!header) return [];

  if (!/\bIbytes\b/.test(header) || !/\bObytes\b/.test(header)) return [];

  for (const line of contents.split('\n')) {
    if (!line.trim() || /^Name\s+/.test(line)) continue;

    const fields = line.trim().split(/\s+/);
    if (fields.length < 8) continue;

    const name = fields[0];
    const rxPackets = Number(fields.at(-7));
    const rxBytes = Number(fields.at(-5));
    const txPackets = Number(fields.at(-4));
    const txBytes = Number(fields.at(-2));

    if (!name || Number.isNaN(rxBytes) || Number.isNaN(txBytes)) continue;

    const existing = totals.get(name) || {
      name,
      rxBytes: 0,
      rxPackets: 0,
      txBytes: 0,
      txPackets: 0,
    };

    existing.rxBytes += rxBytes;
    existing.txBytes += txBytes;
    existing.rxPackets += Number.isNaN(rxPackets) ? 0 : rxPackets;
    existing.txPackets += Number.isNaN(txPackets) ? 0 : txPackets;
    totals.set(name, existing);
  }

  return Array.from(totals.values());
}

function parseWindowsNetstat(contents) {
  const bytesLine = contents
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^Bytes\s+/i.test(line));

  if (!bytesLine) return [];

  const parts = bytesLine.split(/\s+/);
  const rxBytes = Number(parts[1]);
  const txBytes = Number(parts[2]);

  if (Number.isNaN(rxBytes) || Number.isNaN(txBytes)) return [];

  return [{ name: 'all', rxBytes, rxPackets: 0, txBytes, txPackets: 0 }];
}

async function getTrafficSnapshot(platform = process.platform) {
  if (platform === 'linux') {
    return parseLinuxProcNetDev(await fs.readFile('/proc/net/dev', 'utf8'));
  }

  if (platform === 'darwin' || platform === 'freebsd' || platform === 'openbsd') {
    const { stdout } = await execFileAsync('netstat', ['-ibn']);
    return parseDarwinNetstat(stdout);
  }

  if (platform === 'win32') {
    const { stdout } = await execFileAsync('netstat', ['-e']);
    return parseWindowsNetstat(stdout);
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function filterInterfaces(snapshot, names) {
  if (!names || names.length === 0) return snapshot;
  const wanted = new Set(names);
  return snapshot.filter((entry) => wanted.has(entry.name));
}

function diffSnapshots(previous, current, seconds) {
  const previousByName = new Map(previous.map((entry) => [entry.name, entry]));

  return current.map((entry) => {
    const old = previousByName.get(entry.name) || entry;
    const rxBytes = Math.max(0, entry.rxBytes - old.rxBytes);
    const txBytes = Math.max(0, entry.txBytes - old.txBytes);
    const rxPackets = Math.max(0, entry.rxPackets - old.rxPackets);
    const txPackets = Math.max(0, entry.txPackets - old.txPackets);

    return {
      name: entry.name,
      rxBytes,
      txBytes,
      rxPackets,
      txPackets,
      rxBytesPerSecond: rxBytes / seconds,
      txBytesPerSecond: txBytes / seconds,
      totalRxBytes: entry.rxBytes,
      totalTxBytes: entry.txBytes,
    };
  });
}

function formatBytes(value) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let amount = value;
  let unit = 0;

  while (Math.abs(amount) >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }

  return `${amount.toFixed(amount >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatReport(samples) {
  if (samples.length === 0) return 'No matching network interfaces found.';

  const nameWidth = Math.max(9, ...samples.map((sample) => sample.name.length));
  const lines = [
    `${'Interface'.padEnd(nameWidth)}  RX/s       TX/s       RX total   TX total`,
    `${'-'.repeat(nameWidth)}  ---------  ---------  ---------  ---------`,
  ];

  for (const sample of samples) {
    lines.push([
      sample.name.padEnd(nameWidth),
      formatBytes(sample.rxBytesPerSecond).padStart(9),
      formatBytes(sample.txBytesPerSecond).padStart(9),
      formatBytes(sample.totalRxBytes).padStart(9),
      formatBytes(sample.totalTxBytes).padStart(9),
    ].join('  '));
  }

  return lines.join('\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function knownInterfaceNames() {
  return Object.keys(os.networkInterfaces());
}

module.exports = {
  diffSnapshots,
  filterInterfaces,
  formatBytes,
  formatReport,
  getTrafficSnapshot,
  knownInterfaceNames,
  parseDarwinNetstat,
  parseLinuxProcNetDev,
  parseWindowsNetstat,
  sleep,
};
