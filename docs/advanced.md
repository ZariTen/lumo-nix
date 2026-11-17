# System setup

For a quick install, use the commands in the [README](../README.md).

## NixOS

Add this input to your system flake:

```nix
inputs.lumo-nix.url = "github:ZariTen/lumo-nix";
```

Pass `inputs` to your modules with `specialArgs = { inherit inputs; };`, then add:

```nix
{ inputs, pkgs, ... }:
{
  environment.systemPackages = [
    inputs.lumo-nix.packages.${pkgs.stdenv.hostPlatform.system}.lumo
  ];
}
```

Rebuild your NixOS configuration as usual.

## Home Manager

Use the same input, pass `inputs` through `extraSpecialArgs`, and use
`home.packages` instead of `environment.systemPackages` in the example above.

For browser sign-in, also add:

```nix
xdg.mimeApps = {
  enable = true;
  defaultApplications."x-scheme-handler/proton-lumo" = [ "lumo.desktop" ];
};
```

## Update

In your configuration folder, run this and rebuild:

```sh
nix flake update lumo-nix
```

## Need help?

- **Sign-in does not return to Lumo:** install the app first and register the handler shown in the [README](../README.md).
- **Credentials do not save:** unlock GNOME Keyring or KDE Wallet. On NixOS, GNOME Keyring can be enabled with `services.gnome.gnome-keyring.enable = true;`.
- **Blank window:** try `WEBKIT_DISABLE_COMPOSITING_MODE=1 lumo`.

For repository updates, see [maintenance](maintenance.md).
