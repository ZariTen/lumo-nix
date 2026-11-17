# Maintenance

## Dependency updates

Dependabot opens weekly PRs on Mondays for:

- `flake.lock` inputs (including nixpkgs), using its native `nix` ecosystem.
- Pinned GitHub Actions, separately from the flake inputs.

The **Check** workflow builds Lumo and runs `nix flake check` on pushes and PRs,
including Dependabot PRs. Updates are not automatically merged.

GitHub documents Nix support [here](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories#nix).
