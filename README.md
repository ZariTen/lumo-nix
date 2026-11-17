# lumo-nix

Run [Proton Lumo](https://lumo.proton.me) on NixOS. This flake repackages
**Lumo 0.5.9** from Proton's official Debian download, pins its SHA-256 hash,
and patches the native GTK 3 / WebKitGTK application for the Nix store.
It does not use an FHS environment or disable WebKit's sandbox.

**Supported platform:** `x86_64-linux` only. The supplied upstream binary is
AMD64; this is not an ARM or macOS build.

## Try it

Enable Nix's `nix-command` and `flakes` experimental features, then:

```sh
nix run github:ZariTen/lumo-nix
```

Or, from a local checkout:

```sh
nix run .
```

`nix run` launches the app but does not permanently register its desktop entry
or browser callback. For browser sign-in, install it using one of the methods
below. The flake's own package outputs permit **only Lumo** as an unfree
package, so these commands do not need `--impure` or `NIXPKGS_ALLOW_UNFREE`.

## Install in your user profile

```sh
nix profile install github:ZariTen/lumo-nix#lumo
lumo
```

This installs the `lumo-desktop` command, a `lumo` alias, the **Lumo** application
launcher, and icons. If your desktop/browser does not automatically select the
sign-in callback handler, register it after installation:

```sh
xdg-mime default lumo.desktop x-scheme-handler/proton-lumo
xdg-mime query default x-scheme-handler/proton-lumo
# Expected: lumo.desktop
```

## NixOS configuration

Add an input to your system flake:

```nix
inputs.lumo-nix.url = "github:ZariTen/lumo-nix";
```

Pass `inputs` to your NixOS modules with
`specialArgs = { inherit inputs; };`, then add this to a module:

```nix
{ inputs, pkgs, ... }:
{
  environment.systemPackages = [
    inputs.lumo-nix.packages.${pkgs.stdenv.hostPlatform.system}.lumo
  ];
}
```

The input uses its own locked nixpkgs by default. Rebuild normally with
`sudo nixos-rebuild switch --flake /path/to/your/config#your-host`.

## Home Manager

Pass `inputs` through Home Manager's `extraSpecialArgs`, then:

```nix
{ inputs, pkgs, ... }:
{
  home.packages = [
    inputs.lumo-nix.packages.${pkgs.stdenv.hostPlatform.system}.lumo
  ];

  xdg.mimeApps = {
    enable = true;
    defaultApplications."x-scheme-handler/proton-lumo" = [ "lumo.desktop" ];
  };
}
```

## Overlay / reuse your own nixpkgs

The overlay builds the package with the consumer's nixpkgs. In a NixOS module
with `inputs` in scope:

```nix
{ inputs, pkgs, lib, ... }:
{
  nixpkgs.overlays = [ inputs.lumo-nix.overlays.default ];
  nixpkgs.config.allowUnfreePredicate = pkg: lib.getName pkg == "lumo";
  environment.systemPackages = [ pkgs.lumo ];
}
```

If you already have an `allowUnfreePredicate`, extend it instead of replacing
it. Equivalent direct packaging is available with
`pkgs.callPackage ./package.nix { }`.

## Desktop requirements and troubleshooting

- Run in a graphical Wayland or X11 session with a working session D-Bus.
- Proton recommends a Secret Service keyring (GNOME Keyring or KDE Wallet) for
  credentials. On NixOS, GNOME Keyring can be enabled with
  `services.gnome.gnome-keyring.enable = true;`; it must also be unlocked by
  your session. The package does not configure your desktop or keyring.
- Browser authentication requires the installed desktop entry and
  `proton-lumo` URL handler described above. If testing from a checkout, use
  `nix profile install .#lumo` before registering the handler.
- For a blank window or GPU-specific rendering issues, try
  `WEBKIT_DISABLE_COMPOSITING_MODE=1 lumo`. This is an opt-in workaround, not
  forced on every user. To test XWayland, try `GDK_BACKEND=x11 lumo`.
- App updates are managed by Nix: update this package, not the read-only store.

### Shell shows “Connection failed / Enable shell access”

In Lumo **0.5.9**, this particular message is a misleading label for a disabled
built-in Shell connector, not evidence of an MCP transport failure. If the
checkbox and **Enable shell access** button are disabled and the dialog says
“Add at least one allowed folder under Filesystem first”, complete these steps:

1. Sign in to Lumo, then open **Settings → Connectors → Filesystem**.
2. Choose **Add folder**, select an existing project/work folder you intend
   Lumo to use, and finish the Filesystem dialog. Do not add your entire home
   directory unless that is deliberately the access you want.
3. Reopen **Shell** and select **Allow the model to run shell commands** or
   **Enable shell access**. The control becomes available once a folder is set.
4. Keep the `run` tool's approval policy on **Ask** unless you explicitly want
   automatic execution. Test with a harmless command such as `pwd` and review
   the approval request.

These grants are per Lumo account. Do not reset MCP servers or delete keychain
credentials to fix this state. Installing Node.js or an MCP server cannot
unlock a checkbox disabled by the missing-folder prerequisite.

**Security:** the allowed folder selects the shell command's permitted starting
working directory; it is **not a filesystem sandbox**. Shell commands run with
your user's permissions and can access files outside that folder. This flake
never enables shell execution, grants folders, or changes approval policies on
your behalf.

This diagnosis follows the upstream 0.5.9 implementation:
[`renderBashAuth` disables the checkbox when there are no folders](https://github.com/ProtonLumo/lumo-desktop/blob/bd5e2c608bac61f215d4a2094e26ef88cb7bc1e0/webview/pages/settings/index.js#L1363-L1398),
[`readiness` blocks Shell until it is enabled and has folders](https://github.com/ProtonLumo/lumo-desktop/blob/bd5e2c608bac61f215d4a2094e26ef88cb7bc1e0/src-tauri/src/tools/connectors/bash.rs#L199-L215),
and [the UI labels that blocked state “Connection failed”](https://github.com/ProtonLumo/lumo-desktop/blob/bd5e2c608bac61f215d4a2094e26ef88cb7bc1e0/webview/pages/settings/index.js#L460-L474).

If it still fails **after** adding a folder and enabling Shell, the same generic
heading can hide a different problem. Capture the exact detail beneath the
heading and reproduce from a terminal with `lumo`; do not assume all
“Connection failed” messages have this cause. Authenticated shell execution
has not been tested by this packaging repository's isolated startup smoke test.

## Build and verify

```sh
nix build .#lumo
nix flake check
nix fmt flake.nix package.nix tests/package.nix

# GUI smoke test on a private Xvfb display and private profile / D-Bus session.
# It does not use your signed-in account, move focus, or require authentication.
nix develop --command bash tests/smoke.sh

# Optional: existing build and an explicit screenshot/log output directory.
nix develop --command bash tests/smoke.sh ./result ./smoke-artifacts
```

The flake check validates desktop-file syntax, the store-qualified launcher,
URL handler, installed icons, ELF interpreter and resolved shared libraries.
The separate GUI test starts the app, waits for a visible Lumo window, checks
that it remains alive, and saves `window.png` and `startup.log` in the printed
artifact directory. Inspect the screenshot to confirm rendering, not just
window creation. Browser sign-in and authenticated chat require a real account
and are not covered by this smoke test.

## Updating Lumo

1. Update `version` in `package.nix` and verify the upstream URL still follows
   the same pattern.
2. Prefetch the new URL and put the returned `hash` into `src.hash`:

   ```sh
   nix store prefetch-file --json https://proton.me/download/lumo/linux/VERSION/Lumo_VERSION_amd64.deb
   ```

3. Update the version in this README, then run the build, flake check and GUI
   smoke test above. Inspect a changed Debian package for new dependencies.
4. Update nixpkgs separately with `nix flake update nixpkgs` when desired, and
   commit `flake.lock` with any dependency change.

## License

The packaging code in this repository is GPL-3.0 (see [LICENSE](LICENSE)).
Proton's downloaded Lumo binary is distributed separately under its own terms;
the repository license does not relicense it. It is conservatively marked
`unfree` in the package metadata.
