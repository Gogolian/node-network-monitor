const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../src/cli');

test('returns defaults for empty argv', () => {
  assert.deepEqual(parseArgs([]), {
    interval: 1,
    count: Infinity,
    interfaces: [],
    json: false,
    list: false,
    help: false,
    version: false,
  });
});

test('parses long and short flags', () => {
  const opts = parseArgs(['--interval', '5', '-n', '3', '--interfaces', 'eth0,wlan0', '--json']);
  assert.equal(opts.interval, 5);
  assert.equal(opts.count, 3);
  assert.deepEqual(opts.interfaces, ['eth0', 'wlan0']);
  assert.equal(opts.json, true);
});

test('sets help, list, and version flags', () => {
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['--help']).help, true);
  assert.equal(parseArgs(['--list']).list, true);
  assert.equal(parseArgs(['--version']).version, true);
  assert.equal(parseArgs(['-v']).version, true);
});

test('rejects unknown options', () => {
  assert.throws(() => parseArgs(['--nope']), /Unknown option: --nope/);
});

test('rejects non-numeric --count (NaN)', () => {
  assert.throws(() => parseArgs(['--count', 'abc']), /must be a positive number/);
});

test('rejects non-numeric --interval (NaN)', () => {
  assert.throws(() => parseArgs(['-i', 'xyz']), /must be a positive number/);
});

test('rejects zero or negative --interval', () => {
  assert.throws(() => parseArgs(['--interval', '0']), /must be a positive number/);
  assert.throws(() => parseArgs(['--interval', '-1']), /must be a positive number/);
});

test('rejects zero or negative --count', () => {
  assert.throws(() => parseArgs(['--count', '0']), /must be a positive number/);
  assert.throws(() => parseArgs(['-n', '-2']), /must be a positive number/);
});

test('rejects --interval missing a value at end of argv', () => {
  assert.throws(() => parseArgs(['--interval']), /requires a value/);
});

test('rejects --interval followed by another flag', () => {
  assert.throws(() => parseArgs(['--interval', '--json']), /requires a value/);
});

test('rejects --count missing a value', () => {
  assert.throws(() => parseArgs(['-n']), /requires a value/);
  assert.throws(() => parseArgs(['--count', '--list']), /requires a value/);
});

test('rejects --interfaces missing a value', () => {
  assert.throws(() => parseArgs(['--interfaces']), /requires a value/);
  assert.throws(() => parseArgs(['--interfaces', '--json']), /requires a value/);
});

test('rejects --interfaces with empty/whitespace value', () => {
  assert.throws(() => parseArgs(['--interfaces', ',  ,']), /at least one interface name/);
});

test('trims and filters --interfaces values', () => {
  const opts = parseArgs(['--interfaces', ' eth0 , , wlan0 ']);
  assert.deepEqual(opts.interfaces, ['eth0', 'wlan0']);
});
