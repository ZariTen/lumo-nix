#!/usr/bin/env bash
# Run with: nix develop --command bash tests/smoke.sh
set -euo pipefail

package="${1:-$(nix build .#lumo --no-link --print-out-paths)}"
artifacts="${2:-$(mktemp -d -t lumo-smoke.XXXXXXXX)}"
mkdir -p "$artifacts"
artifacts="$(realpath "$artifacts")"
profile="$(mktemp -d -t lumo-profile.XXXXXXXX)"
mkdir -m 700 "$profile/run"
trap 'rm -rf "$profile"' EXIT

# Use a private display, D-Bus session and profile; never touch a real login.
# The quoted script must expand its variables in the child shell, not here.
# shellcheck disable=SC2016
HOME="$profile" \
XDG_CONFIG_HOME="$profile/config" \
XDG_CACHE_HOME="$profile/cache" \
XDG_DATA_HOME="$profile/data" \
XDG_RUNTIME_DIR="$profile/run" \
XDG_CURRENT_DESKTOP="" \
WAYLAND_DISPLAY="" \
GDK_BACKEND=x11 \
LIBGL_ALWAYS_SOFTWARE=1 \
xvfb-run -a -s '-screen 0 1280x900x24 -nolisten tcp' \
  dbus-run-session -- bash -euo pipefail -c '
    "$1/bin/lumo-desktop" > "$2/startup.log" 2>&1 &
    pid=$!
    trap '\''kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true'\'' EXIT
    window=""
    for attempt in $(seq 1 30); do
      if ! kill -0 "$pid" 2>/dev/null; then
        cat "$2/startup.log" >&2
        echo "Lumo exited before opening a window" >&2
        exit 1
      fi
      window=$(xdotool search --onlyvisible --name "[Ll]umo" 2>/dev/null || true)
      if [ -n "$window" ]; then break; fi
      sleep 1
    done
    test -n "$window" || { cat "$2/startup.log" >&2; echo "No Lumo window" >&2; exit 1; }
    # Give WebKit time to render (and expose delayed startup failures).
    sleep 10
    kill -0 "$pid"
    read -r window <<< "$window"
    xdotool getwindowname "$window"
    magick import -window "$window" "$2/window.png"
    echo "PASS: Lumo opened a window and remained running; screenshot: $2/window.png"
  ' bash "$package" "$artifacts"
