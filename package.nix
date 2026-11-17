{
  lib,
  stdenvNoCC,
  fetchurl,
  dpkg,
  autoPatchelfHook,
  wrapGAppsHook3,
  webkitgtk_4_1,
  gtk3,
  glib,
  glib-networking,
  gdk-pixbuf,
  cairo,
  dbus,
  libsoup_3,
  libayatana-appindicator,
  libsecret,
  openssl,
  xdg-utils,
  stdenv,
}:

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "lumo";
  version = "0.5.9";
  strictDeps = true;

  src = fetchurl {
    url = "https://proton.me/download/lumo/linux/${finalAttrs.version}/Lumo_${finalAttrs.version}_amd64.deb";
    hash = "sha256-mzYnJvaACYjwstr36wG9UYCk7M/PQdg1RSnmsVv6Ulc=";
  };

  nativeBuildInputs = [
    dpkg
    autoPatchelfHook
    wrapGAppsHook3
  ];
  buildInputs = [
    webkitgtk_4_1
    gtk3
    glib
    glib-networking
    gdk-pixbuf
    cairo
    dbus
    libsoup_3
    stdenv.cc.cc.lib
  ];

  # Tauri/tray/keyring libraries are loaded dynamically, not ELF NEEDED entries.
  runtimeDependencies = [
    (lib.getLib libayatana-appindicator)
    (lib.getLib libsecret)
    (lib.getLib openssl)
  ];

  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    runHook preInstall

    install -Dm755 usr/bin/lumo-desktop "$out/bin/lumo-desktop"
    ln -s lumo-desktop "$out/bin/lumo"
    cp -r usr/share "$out/share"

    substituteInPlace "$out/share/applications/lumo.desktop" \
      --replace-fail 'Exec=lumo-desktop %u' "Exec=$out/bin/lumo-desktop %u" \
      --replace-fail 'MimeType=x-scheme-handler/proton-lumo' 'MimeType=x-scheme-handler/proton-lumo;'

    # Upstream's @2 directory contains an actual 256x256 PNG.
    mv "$out/share/icons/hicolor/256x256@2" "$out/share/icons/hicolor/256x256"

    runHook postInstall
  '';

  preFixup = ''
    gappsWrapperArgs+=(
      --prefix GIO_EXTRA_MODULES : "${glib-networking}/lib/gio/modules"
      --prefix PATH : "${lib.makeBinPath [ xdg-utils ]}"
    )
  '';

  meta = {
    description = "Lumo: your private AI assistant";
    homepage = "https://lumo.proton.me";
    # The packaging repo's GPL license does not license Proton's binary.
    license = lib.licenses.unfree;
    sourceProvenance = [ lib.sourceTypes.binaryNativeCode ];
    platforms = [ "x86_64-linux" ];
    mainProgram = "lumo-desktop";
  };
})
