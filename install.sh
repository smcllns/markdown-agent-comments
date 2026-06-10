#!/bin/sh
# Install the standalone `mdac` binary.
#   curl -fsSL https://raw.githubusercontent.com/smcllns/markdown-agent-comments/main/install.sh | sh
#
# macOS only for now. On other systems, install via a JS runtime:
#   bun add -g markdown-agent-comments
set -eu

REPO="smcllns/markdown-agent-comments"
INSTALL_DIR="${MDAC_INSTALL_DIR:-$HOME/.local/bin}"

os="$(uname -s)"
arch="$(uname -m)"

if [ "$os" != "Darwin" ]; then
  echo "mdac: prebuilt binaries are macOS-only for now (detected: $os)." >&2
  echo "Install via a JS runtime instead:  bun add -g markdown-agent-comments" >&2
  exit 1
fi

case "$arch" in
  arm64) asset="mdac-darwin-arm64" ;;
  x86_64) asset="mdac-darwin-x64" ;;
  *)
    echo "mdac: unsupported macOS architecture: $arch" >&2
    exit 1
    ;;
esac

url="https://github.com/${REPO}/releases/latest/download/${asset}"

echo "Downloading ${asset}..."
mkdir -p "$INSTALL_DIR"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fsSL "$url" -o "$tmp"
chmod +x "$tmp"
mv "$tmp" "$INSTALL_DIR/mdac"
trap - EXIT

echo "Installed mdac to $INSTALL_DIR/mdac"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    echo ""
    echo "⚠️  $INSTALL_DIR is not on your PATH. Add it, then restart your shell:"
    echo "    echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc"
    ;;
esac

echo "Run 'mdac doctor' to verify your setup."
