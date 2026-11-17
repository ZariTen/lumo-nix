# Maintenance

## Dependency updates

Dependabot opens weekly PRs on Mondays for:

- `flake.lock` inputs (including nixpkgs), using its native `nix` ecosystem.
- Pinned GitHub Actions, separately from the flake inputs.

The **Check** workflow builds Lumo and runs `nix flake check` on pushes and PRs,
including Dependabot PRs. Updates are not automatically merged.

GitHub documents Nix support [here](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories#nix).

## Lumo releases

The **Update Lumo** workflow checks Proton's official Linux update feed daily at
09:17 UTC. It can also be started manually from GitHub's **Actions** tab and
runs when the updater implementation changes on `main`.

For a newer stable AMD64 Debian release it:

1. Downloads from `https://proton.me/download/lumo/linux/VERSION/Lumo_VERSION_amd64.deb`
   and computes the SHA-256 with Nix.
2. Updates only `version` and `src.hash` in `package.nix`.
3. Builds the new package and runs all flake checks.
4. Creates or refreshes one PR on `bot/update-lumo` after the checks pass.

Unchanged or older versions do nothing. Invalid metadata, unavailable downloads,
or failing checks stop the workflow without publishing an update. Updates are
not automatically merged. Inspect the new app with `tests/smoke.sh` before merging.

### One-time repository setting

Under **Settings → Actions → General → Workflow permissions**, enable
**Allow GitHub Actions to create and approve pull requests**. The workflow uses
the built-in `GITHUB_TOKEN`; no personal token is required. An organization policy
may prevent enabling this setting.

GitHub can suppress PR-triggered workflows for PRs created with `GITHUB_TOKEN`.
The Lumo updater therefore runs the build and checks itself **before** creating
its PR. Dependabot PRs run the separate **Check** workflow normally.

### Local verification

```sh
nix flake check
nix shell --inputs-from . nixpkgs#nodejs --command node scripts/update-lumo.mjs
```

The second command performs the real release check and edits `package.nix` only
when a newer supported release exists. Updater unit tests run offline as part of
`nix flake check`.
