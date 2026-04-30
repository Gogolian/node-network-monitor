const test = require('node:test');
const assert = require('node:assert/strict');
const {
  diffSnapshots,
  filterInterfaces,
  formatBytes,
  parseDarwinNetstat,
  parseLinuxProcNetDev,
  parseWindowsNetstat,
} = require('../src/monitor');

test('parses Linux /proc/net/dev counters', () => {
  const parsed = parseLinuxProcNetDev(`Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 1000 10 0 0 0 0 0 0 2000 20 0 0 0 0 0 0
  eth0: 3000 30 0 0 0 0 0 0 4000 40 0 0 0 0 0 0
`);

  assert.deepEqual(parsed, [
    { name: 'lo', rxBytes: 1000, rxPackets: 10, txBytes: 2000, txPackets: 20 },
    { name: 'eth0', rxBytes: 3000, rxPackets: 30, txBytes: 4000, txPackets: 40 },
  ]);
});

test('parses macOS/BSD netstat byte counters', () => {
  const parsed = parseDarwinNetstat(`Name  Mtu   Network       Address            Ipkts Ierrs    Ibytes    Opkts Oerrs    Obytes  Coll
lo0   16384 <Link#1>                         10     0      1000       20     0      2000     0
en0   1500  <Link#4>                         30     0      3000       40     0      4000     0
en0   1500  fe80::1                          3      0       300        4     0       400     0
`);

  assert.deepEqual(parsed, [
    { name: 'lo0', rxBytes: 1000, rxPackets: 10, txBytes: 2000, txPackets: 20 },
    { name: 'en0', rxBytes: 3300, rxPackets: 33, txBytes: 4400, txPackets: 44 },
  ]);
});

test('parses Windows netstat aggregate byte counters', () => {
  const parsed = parseWindowsNetstat(`Interface Statistics

                           Received            Sent

Bytes                     12345               67890
Unicast packets           1                   2
`);

  assert.deepEqual(parsed, [
    { name: 'all', rxBytes: 12345, rxPackets: 0, txBytes: 67890, txPackets: 0 },
  ]);
});

test('filters and diffs snapshots', () => {
  const previous = [
    { name: 'lo', rxBytes: 100, rxPackets: 1, txBytes: 200, txPackets: 2 },
    { name: 'eth0', rxBytes: 1000, rxPackets: 10, txBytes: 2000, txPackets: 20 },
  ];
  const current = [
    { name: 'lo', rxBytes: 150, rxPackets: 2, txBytes: 260, txPackets: 3 },
    { name: 'eth0', rxBytes: 1300, rxPackets: 13, txBytes: 2800, txPackets: 28 },
  ];

  const filtered = filterInterfaces(current, ['eth0']);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, 'eth0');

  assert.deepEqual(diffSnapshots(previous, filtered, 2), [
    {
      name: 'eth0',
      rxBytes: 300,
      txBytes: 800,
      rxPackets: 3,
      txPackets: 8,
      rxBytesPerSecond: 150,
      txBytesPerSecond: 400,
      totalRxBytes: 1300,
      totalTxBytes: 2800,
    },
  ]);
});

test('formats bytes', () => {
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(10485760), '10 MB');
});
