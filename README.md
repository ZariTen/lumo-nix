# Lumo for NixOS

Run [Proton Lumo](https://lumo.proton.me) on **64-bit Intel/AMD Linux**.
Requires Nix with flakes enabled.

## Run

```sh
nix run github:ZariTen/lumo-nix
```

## Install

For an app-menu shortcut and browser sign-in:

```sh
nix profile install github:ZariTen/lumo-nix#lumo
xdg-mime default lumo.desktop x-scheme-handler/proton-lumo
```

Open **Lumo** from your app menu, or run `lumo` in a terminal.

## Update

```sh
nix profile upgrade lumo
```

## Good to know

- **Quit:** use **Lumo → Quit** or **Ctrl+Q**. Closing the window keeps it in the tray.
- **Shell access:** add a folder under **Settings → Connectors → Filesystem**, then enable **Shell**. Keep approvals on **Ask**; shell commands are not sandboxed.
- **Sign-in credentials:** you need a working, unlocked GNOME Keyring or KDE Wallet.

For system configuration, troubleshooting, or contributing, see the [advanced guide](docs/advanced.md).

[GPL-3.0 packaging license](LICENSE) · [Upstream source](https://github.com/ProtonLumo/lumo-desktop)
