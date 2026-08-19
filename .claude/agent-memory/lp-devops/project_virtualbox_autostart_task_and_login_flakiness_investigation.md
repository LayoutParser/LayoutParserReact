---
name: project_virtualbox_autostart_task_and_login_flakiness_investigation
description: New Scheduled Task to headless-start the Ubuntu VirtualBox VM on Windows boot, plus diagnosis (not fix) of flaky first-login-fails-then-retry-works reports.
metadata:
  type: project
---

Requested 2026-08-19 on branch `feat/ia-fallback-polling` (not a dedicated infra branch — user
did not ask to switch, so the new script was added in place; confirm before it's committed).

**Cloudflare Quick Tunnel restart robustness (ask #1):** reviewed
`scripts/Register-CloudflareTunnel.ps1` — already correct for the "host reboots, nothing works
until someone opens PowerShell" problem: Scheduled Task `Cloudflared-QuickTunnel`, `SYSTEM`
principal, `-AtStartup` trigger, `RestartCount 999`/`RestartInterval 1min`, log rotation to
`logs/cloudflared-tunnel.log`. No domain purchased yet (confirmed again by user), so Quick
Tunnel stays; no code change made here. See [[project_bff_persistent_logs_and_cloudflare_tunnel_task]].

**New: `scripts/Register-VirtualBoxAutostart.ps1` (ask #2)** — registers a second, independent
Scheduled Task (`VirtualBox-Autostart` by default) that runs
`VBoxManage startvm <VmName> --type headless` at boot (`-AtStartup` + 30s `Delay`), same
idempotent/`-Force`/rotated-log pattern as the Cloudflare script. Key decision, backed by
research into VirtualBox on Windows: **principal is NOT `SYSTEM` by default** — it requires a
mandatory `-RunAsUser` parameter (the Windows account that owns the VM registration). Reason:
even though VirtualBox 6.0+ ships `VBoxSDS` (a system service that technically allows starting
VMs without an interactive logon), VM registration (`VirtualBox.xml` + default VM folder) lives
under the *owning user's* profile, not a machine-wide location — `SYSTEM` would look at its own
(nonexistent) profile and fail with "machine not found" even with `VBoxSDS` running and healthy.
Default `-LogonType S4U` (no stored password, works without prior interactive logon, local-only
command so S4U's lack of network credentials doesn't matter); `-LogonType Password` is offered
as a fallback (`-Password` SecureString) in case S4U behaves inconsistently under this host's
group policy. **Not yet applied on the production host** — needs `-VmName` (the exact VirtualBox
VM name) and `-RunAsUser` filled in by the user; script deliberately does not guess these since
this WSL environment has no access to the production VirtualBox install.

**Login flakiness investigation (ask #3) — hypothesis only, not fixed:**
Reviewed `server/src/oidc.ts` and `server/src/auth.ts`. Findings:
- `publicOrigin`/OIDC `redirectUri` are computed once at BFF boot from `BFF_PUBLIC_ORIGIN`
  (`server/src/config.ts`), not per-request. If this env var lags behind a Quick Tunnel URL that
  changed since the last `cloudflared` restart, login fails *consistently* (redirect_uri
  mismatch), not intermittently — so this alone doesn't explain "fails once, then retry works".
- **Concrete bug found in `GoogleOidcClient` (`server/src/oidc.ts` ~line 228-235):**
  `this.#discovery ??= openidClient.discovery(...)` memoizes the discovery *promise* on first
  call. If that first discovery request to `accounts.google.com` fails (cold outbound network
  right after a host/tunnel restart, DNS warm-up, etc.), the rejected promise stays cached
  forever — every subsequent Google login attempt keeps awaiting the same rejected promise and
  fails until the BFF process itself restarts. This does NOT match "second try works" but IS a
  real latent bug worth flagging to whoever owns `server/` (`@lp-front-dev`): discovery failures
  should not be memoized past their own resolution.
- Best-fit hypothesis for "first attempt fails, back-and-retry works" (Entra path in
  particular): MSAL Node's own authority-metadata fetch on `getAuthCodeUrl`/
  `acquireTokenByCode` can be slow/transient-fail on a cold outbound connection (right after
  reboot, or after a period with no traffic through the Cloudflare tunnel/IIS ARR chain) but,
  unlike the Google client above, does not permanently poison a cache — a second attempt just
  retries the network call fresh and succeeds once the path has warmed up. This is a hypothesis,
  not confirmed — no BFF logs from an actual flaky occurrence were reviewed in this session
  (would show as `auth.login.start_failed` or `auth.login.callback_failed` events in
  `logs/bff.log` per [[project_bff_persistent_logs_and_cloudflare_tunnel_task]]).
- User's phrasing ("antes desse reinicio") was ambiguous — could mean "this already happened
  before I noticed the restart problem" or "right before/around a restart". Not resolved; asked
  back to the user rather than assumed.

**How to apply:** do not implement any BFF code fix (out of `@lp-devops` authority) — hand the
`GoogleOidcClient` discovery-memoization bug and the MSAL cold-start hypothesis to
`@lp-front-dev`/whoever owns `server/`, along with the instruction to correlate real occurrences
against `logs/bff.log` timestamps before changing retry/caching logic.
