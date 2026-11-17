# Advanced usage

## NixOS / Home Manager

Add this input to your configuration flake:

```nix
inputs.lumo-nix.url = "github:ZariTen/lumo-nix";
```

Pass `inputs` to NixOS modules with `specialArgs = { inherit inputs; };`, then:

```nix
{ inputs, pkgs, ... }:
{
  environment.systemPackages = [
    inputs.lumo-nix.packages.${pkgs.stdenv.hostPlatform.system}.lumo
  ];
}
```

For Home Manager, pass `inputs` through `extraSpecialArgs` and use `home.packages`
instead of `environment.systemPackages`. To register browser sign-in:

```nix
xdg.mimeApps = {
  enable = true;
  defaultApplications."x-scheme-handler/proton-lumo" = [ "lumo.desktop" ];
};
```

Update your configuration's Lumo input with `nix flake update lumo-nix`, then
rebuild your system or Home Manager configuration.

## Overlay

To build with your own nixpkgs instead of this repository's locked version:

```nix
{ inputs, pkgs, lib, ... }:
{
  nixpkgs.overlays = [ inputs.lumo-nix.overlays.default ];
  nixpkgs.config.allowUnfreePredicate = pkg: lib.getName pkg == "lumo";
  environment.systemPackages = [ pkgs.lumo ];
}
```

Extend an existing `allowUnfreePredicate` instead of replacing it. The standalone
flake outputs already permit Lumo without enabling other unfree packages.

## Troubleshooting

- Browser sign-in needs an installed desktop entry, not just `nix run`.
  Check the handler with `xdg-mime query default x-scheme-handler/proton-lumo`;
  the result should be `lumo.desktop`.
- On NixOS, GNOME Keyring can be enabled with
  `services.gnome.gnome-keyring.enable = true;`. Your session must unlock it.
- For GPU-specific blank windows, try `WEBKIT_DISABLE_COMPOSITING_MODE=1 lumo`.
  For XWayland, try `GDK_BACKEND=x11 lumo`. Neither workaround is forced.
- Shell's “Connection failed / Enable shell access” message can mean it has not
  been enabled. Add an existing folder under **Filesystem**, then enable **Shell**.
  This is a per-account permission, not an MCP connection failure. The selected
  folder is a starting directory, not a filesystem sandbox.
- The titlebar's second “Lumo” row is the application menu. Closing the window
  hides it to the tray; **Ctrl+Q** quits.

## Development

The package repackages Proton's official AMD64 Debian binary; it does not build
Lumo from source. Only `x86_64-linux` is supported.

```sh
nix build .#lumo
nix flake check
nix fmt flake.nix package.nix tests/package.nix
nix develop --command bash tests/smoke.sh
```

The GUI test uses a private display, profile and D-Bus session and saves a screenshot
and startup log. Inspect the screenshot to confirm rendering. It does not test
authenticated sign-in, chat or shell execution.
