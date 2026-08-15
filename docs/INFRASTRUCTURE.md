# Infrastructure

The lab MiniDash runs on and watches. [REPORT.md](REPORT.md) covers the dashboard itself;
this document covers the environment underneath it — the network, the machines, and where
the trust boundaries actually sit.

**Verified 2026-08-14** by direct read from the running systems. Anything that could not be
read is marked unverified rather than guessed. Addresses and identifiers are placeholders.

## Network

One subnet, one broadcast domain, no VLANs. Routing and DHCP are handled by the gateway
the ISP supplied, which was inherited rather than chosen. Every host reaches every other
host on every port: the hypervisor, the monitoring host, lab guests, and consumer devices
nobody administers all share one flat space with no filtering between them.

The layers do not line up with the trust boundaries, which is the most useful thing to
understand about this build.

```
                                  INTERNET
                                      |
                          ISP-supplied consumer gateway
                        NAT, DHCP, and routing for the whole house
                                      |
   ===================================+====================================
   BOUNDARY 1  perimeter NAT. The only boundary the network itself enforces.
   ====================================================================

   +----------------------------------------------------------------------+
   |                     FLAT LAN - ONE SUBNET, NO VLANS                   |
   |                                                                       |
   |   +-----------------+   +-----------------+   +-------------------+   |
   |   | HYPERVISOR NODE |   | ALWAYS-ON HOST  |   | HOUSEHOLD DEVICES |   |
   |   |                 |   |                 |   |                   |   |
   |   | guests          |   | MiniDash and    |   | phones, laptops,  |   |
   |   |                 |   | the stack it    |   | consumer IoT,     |   |
   |   |                 |   | reads from      |   | not administered  |   |
   |   +-----------------+   +-----------------+   +-------------------+   |
   |                                                                       |
   |   No filtering, no tagging, no boundary of any kind in here.          |
   +----------------------------------------------------------------------+

   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   BOUNDARY 2  mesh VPN overlay. Device-authenticated, cuts across the LAN
               rather than sitting inside it. MiniDash and the monitoring
               interfaces are published here and are NOT bound to the LAN
               address. This is the boundary doing the real work.
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   --------------------------------------------------------------------
   BOUNDARY 3  loopback-only bindings. The telemetry collector and the local
               model runtime answer only to the host itself. Weakest to
               reason about: a per-service decision that nothing enforces.
   --------------------------------------------------------------------
```

Segmentation is the largest open gap. Lab guests sit on the same flat space as devices
nobody administers, and the cost of fixing it is the reason it has not been fixed.

## Machines

**Hypervisor node.** Proxmox, reachable on the LAN and over the overlay. Guest inventory,
resource model, and storage backend are unverified — the host requires interactive
authentication and was not read.

**Always-on host.** A small-form-factor desktop, 16 GB, wired rather than wireless. It runs
MiniDash, the collector, Netdata, Uptime Kuma, Homepage, the Restic backup job, and a local
model runtime. A remote-access service and a browser-based terminal also listen on it.
Those widen its exposure and have not been reviewed against any threat model, which is
worth stating plainly rather than leaving in a port list nobody reads.

Monitoring lives here rather than as a guest on the hypervisor. Whatever the original
reason, the outcome is correct: hypervisor failure and monitoring failure are not the same
event, so the hypervisor going down is something the monitoring can still report.

## Exposure model

Services that could have been published to the LAN because it was easier are instead bound
to the overlay address or to loopback. The monitoring stack follows that pattern rather
than making an exception for itself, which is the right instinct — a dashboard aggregating
auth events and session data is a more attractive target than the things it watches.

Given a flat LAN with unadministered devices on it, this is doing more security work than
the network is.

## The dead man switch

The collector exposes a health endpoint returning a boolean and, more importantly, a
timestamp of its last successful run:

```
GET http://<COLLECTOR_HOST>:<PORT>/health
{"ok": true, "last_collector_run": "2026-08-14T22:45:24-04:00"}
```

The switch is the timestamp, not the boolean.

Monitoring that reports failures cannot report its own death. A collector that crashes
sends nothing, and nothing is exactly what a healthy system also sends. Silence is
ambiguous, and the ambiguity always resolves optimistically: no alerts looks identical to
no problems, right up until someone checks by hand and finds out how long it has been
wrong.

A freshness timestamp inverts that. Nothing has to happen for staleness to become visible.
A watcher reads the endpoint, compares the timestamp against a threshold, and fires when
the collector stops updating it — crashed process, wedged host, full disk, broken
dependency, it does not matter which. The collector never has to detect its own failure,
which is fortunate, because a dead process is bad at self-diagnosis.

**What it does not cover.** A collector that runs on schedule but produces wrong data keeps
the timestamp fresh and the switch stays quiet. Liveness is not correctness. And the
guarantee depends entirely on where the watcher runs: if it polls from the same machine as
the collector, that machine failing takes out watcher and watched together, and the switch
only appears to work.

## Not verified

Honest list, not a roadmap. These are unknown, not pending.

- **Where the dead man switch watcher runs**, and therefore whether it survives the
  monitoring host failing. This is the single most valuable gap to close.
- **The staleness threshold**, and whether the switch has ever fired for a real outage or
  a false positive.
- **Hypervisor guests**: inventory, resource model, storage backend.
- **Backups**: Restic snapshots to an external SSD are surfaced in the dashboard, but no
  restore has been performed. Until one has, recovery is a hypothesis.
- **Power behaviour**: whether guests start on boot, and whether the hardware powers on by
  itself after a cut, are both unread.
- **Network segmentation** was verified absent only from the always-on host's own port.
