# node-network-monitor

A dependency-free network traffic monitor written in Node.js. It samples operating-system network counters and reports traffic going in and out of the computer.

## Install

```sh
npm install -g .
```

Or run it directly from the repository:

```sh
node bin/network-monitor.js
```

## Usage

```sh
network-monitor [options]
```

Options:

- `-i, --interval <seconds>`: seconds between samples. Defaults to `1`.
- `-n, --count <samples>`: number of reports to print. Defaults to unlimited.
- `--interfaces <names>`: comma-separated interface names to include, such as `eth0,wlan0`.
- `--json`: print newline-delimited JSON.
- `--list`: list detected interface names.
- `-h, --help`: show help.

Examples:

```sh
node bin/network-monitor.js --count 3
node bin/network-monitor.js --interfaces eth0 --json
node bin/network-monitor.js --list
```

## Platform notes

- Linux reads `/proc/net/dev`.
- macOS and BSD use `netstat -ibn`.
- Windows uses `netstat -e` and reports aggregate traffic as `all`.

This tool uses counters exposed by the operating system. It does not capture packet payloads, require elevated packet-capture privileges, or use third-party dependencies.
