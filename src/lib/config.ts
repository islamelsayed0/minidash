// Infrastructure addresses come from the environment and are never committed. A real
// host address in source is published the moment the repo is, and stays in history after
// it is edited out. Defaults are loopback so a fresh clone runs without pointing at
// anyone's machine. Set them in a local env file, which git ignores.
export const COLLECTOR_BASE = process.env.COLLECTOR_BASE ?? "http://127.0.0.1:8090";
export const NETDATA_BASE = process.env.NETDATA_BASE ?? "http://127.0.0.1:19999";
