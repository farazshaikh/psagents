{ pkgs ? import <nixpkgs> {} }:

let
  # Go version to use
  go = pkgs.go_1_22;

  # Development tools
  devTools = with pkgs; [
    # Go tools
    go
    gopls           # Go language server
    golangci-lint   # Go linter
    delve          # Go debugger
    gotools        # Go tools (gofmt, etc.)

    # Build tools
    pkg-config
    gnumake

    # Version control
    git
    gh             # GitHub CLI

    # Shell tools
    ripgrep        # Fast grep
    fd            # Fast find
    jq            # JSON processor
    yq            # YAML processor

    # Database tools (for Neo4j)
    neo4j
  ];

in
pkgs.mkShell {
  buildInputs = devTools;

  shellHook = ''
    # Set Go environment variables
    export GOPATH="$HOME/go"
    export GOROOT="${go}/share/go"
    export GO111MODULE="on"

    # Print welcome message
    echo "🚀 Go Development Environment"
    echo "Go version: $(go version)"
    echo "GOPATH: $GOPATH"
    echo "GOROOT: $GOROOT"
    echo ""
    echo "Available tools:"
    echo "  - go: Go compiler and tools"
    echo "  - gopls: Go language server"
    echo "  - golangci-lint: Go linter"
    echo "  - dlv: Go debugger"
    echo "  - gotools: Go tools (gofmt, etc.)"
    echo "  - git: Version control"
    echo "  - gh: GitHub CLI"
    echo "  - rg: Fast grep"
    echo "  - fd: Fast find"
    echo "  - jq: JSON processor"
    echo "  - yq: YAML processor"
    echo "  - neo4j: Graph database"
  '';
}