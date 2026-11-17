{
  runCommand,
  lumo,
  desktop-file-utils,
  glibc,
  patchelf,
}:

runCommand "lumo-package-test"
  {
    nativeBuildInputs = [
      desktop-file-utils
      glibc.bin
      patchelf
    ];
  }
  ''
    test -x ${lumo}/bin/lumo-desktop
    test -L ${lumo}/bin/lumo
    test -f ${lumo}/share/icons/hicolor/32x32/apps/lumo-desktop.png
    test -f ${lumo}/share/icons/hicolor/128x128/apps/lumo-desktop.png
    test -f ${lumo}/share/icons/hicolor/256x256/apps/lumo-desktop.png
    desktop-file-validate ${lumo}/share/applications/lumo.desktop
    grep -Fx 'Exec=${lumo}/bin/lumo-desktop %u' ${lumo}/share/applications/lumo.desktop
    grep -Fx 'MimeType=x-scheme-handler/proton-lumo;' ${lumo}/share/applications/lumo.desktop

    # Check the real ELF, not the GTK environment wrapper.
    binary=${lumo}/bin/.lumo-desktop-wrapped
    test -x "$binary"
    test -x "$(patchelf --print-interpreter "$binary")"
    ldd "$binary" > dependencies.txt
    echo 'PASS: desktop integration, icons, interpreter and ELF dependencies'
    if grep -q 'not found' dependencies.txt; then
      echo 'Unresolved runtime library' >&2
      exit 1
    fi
    mkdir -p "$out"
    cp dependencies.txt "$out/"
    echo 'PASS: package validation complete'
  ''
