{
  description = "PS Agents Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
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

          # Database tools
          neo4j          # Graph database
          qdrant         # Vector database
        ];

        # Qdrant service scripts
        startQdrant = pkgs.writeScriptBin "start-qdrant" ''
          #!${pkgs.bash}/bin/bash
          QDRANT_DIR="$PWD/data/qdrant"
          PID_FILE="$QDRANT_DIR/qdrant.pid"
          LOG_FILE="$QDRANT_DIR/qdrant.log"
          mkdir -p "$QDRANT_DIR"

          # Check if Qdrant is already running
          if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
              echo "Qdrant is already running (PID: $PID)"
              exit 0
            else
              rm -f "$PID_FILE"
            fi
          fi

          # Create Qdrant config
          cat > "$QDRANT_DIR/config.yaml" << EOF
storage:
  dir: $QDRANT_DIR

service:
  host: 127.0.0.1
  http_port: 6333
  grpc_port: 6334

telemetry:
  disabled: true
EOF

          # Start Qdrant in background
          echo "Starting Qdrant..."
          nohup ${pkgs.qdrant}/bin/qdrant --config-path "$QDRANT_DIR/config.yaml" > "$LOG_FILE" 2>&1 &
          PID=$!
          echo $PID > "$PID_FILE"
          
          # Wait for Qdrant to start
          echo "Waiting for Qdrant to start..."
          for i in {1..30}; do
            if curl -s http://localhost:6333/healthz >/dev/null; then
              echo "Qdrant is running (PID: $PID)"
              exit 0
            fi
            sleep 1
          done
          
          echo "Failed to start Qdrant"
          exit 1
        '';

        stopQdrant = pkgs.writeScriptBin "stop-qdrant" ''
          #!${pkgs.bash}/bin/bash
          QDRANT_DIR="$PWD/data/qdrant"
          PID_FILE="$QDRANT_DIR/qdrant.pid"

          if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
              echo "Stopping Qdrant (PID: $PID)..."
              kill "$PID"
              rm -f "$PID_FILE"
              echo "Qdrant stopped"
            else
              echo "Qdrant is not running"
              rm -f "$PID_FILE"
            fi
          else
            echo "Qdrant is not running"
          fi
        '';

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = devTools ++ [ startQdrant stopQdrant ];

          shellHook = ''
            # Create temporary directory for Go
            mkdir -p /tmp/nix-shell-$UID-0
            chmod 700 /tmp/nix-shell-$UID-0

            # Set Go environment variables
            export GOPATH="$HOME/go"
            export GOROOT="${go}/share/go"
            export GO111MODULE="on"
            export TMPDIR="/tmp/nix-shell-$UID-0"

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
            echo "  - qdrant: Vector database"
            echo ""
            echo "Qdrant commands:"
            echo "  start-qdrant  - Start Qdrant in background"
            echo "  stop-qdrant   - Stop Qdrant"
            echo "  tail -f data/qdrant/qdrant.log  - View Qdrant logs"
          '';
        };
      }
    );
} 