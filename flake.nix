{
  description = "Lumo desktop for NixOS — repackaged from Proton's official Debian release";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
        # Permission applies only to this binary, not all unfree software.
        config.allowUnfreePredicate = pkg: nixpkgs.lib.getName pkg == "lumo";
      };
      lumo = pkgs.callPackage ./package.nix { };
    in
    {
      packages.${system} = {
        inherit lumo;
        default = lumo;
      };

      apps.${system} = {
        lumo = {
          type = "app";
          program = "${lumo}/bin/lumo-desktop";
          meta.description = "Lumo: your private AI assistant";
        };
        default = {
          type = "app";
          program = "${lumo}/bin/lumo-desktop";
          meta.description = "Lumo: your private AI assistant";
        };
      };

      overlays.default = final: _prev: {
        lumo = final.callPackage ./package.nix { };
      };

      devShells.${system}.default = pkgs.mkShellNoCC {
        packages = with pkgs; [
          xvfb-run
          xdotool
          imagemagick
          dbus
        ];
      };

      checks.${system} = {
        package = pkgs.callPackage ./tests/package.nix { inherit lumo; };
        updater = pkgs.runCommand "lumo-updater-tests" { nativeBuildInputs = [ pkgs.nodejs ]; } ''
          mkdir -p scripts tests
          cp ${./scripts/update-lumo.mjs} scripts/update-lumo.mjs
          cp ${./tests/update-lumo.test.mjs} tests/update-lumo.test.mjs
          node --test tests/update-lumo.test.mjs
          touch "$out"
        '';
      };
      formatter.${system} = pkgs.nixfmt;
    };
}
