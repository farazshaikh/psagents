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
          gopls # Go language server
          golangci-lint # Go linter
          delve # Go debugger
          gotools # Go tools (gofmt, etc.)

          # Build tools
          pkg-config
          gnumake

          # Version control
          git
          gh # GitHub CLI

          # Node.js tools
          nodejs_20 # Node.js runtime

          # Shell tools
          ripgrep # Fast grep
          fd # Fast find
          jq # JSON processor
          yq # YAML processor

          # Database tools
          neo4j # Graph database
          qdrant # Vector database
        ];

        # Qdrant service scripts
        startQdrant = pkgs.writeScriptBin "start-qdrant" ''
                    #!${pkgs.bash}/bin/bash
                    QDRANT_DIR="$PWD/data/qdrant"
                    STORAGE_DIR="$QDRANT_DIR/db/storage"
                    SNAPSHOT_DIR="$QDRANT_DIR/db/snapshots"
                    PID_FILE="$QDRANT_DIR/qdrant.pid"
                    LOG_FILE="$QDRANT_DIR/qdrant.log"

                    # Create required directories
                    mkdir -p "$STORAGE_DIR" "$SNAPSHOT_DIR"

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
            dir: $STORAGE_DIR
            snapshots_path: $SNAPSHOT_DIR

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

        # Neo4j service scripts
        startNeo4j = pkgs.writeScriptBin "start-neo4j" ''
                    #!${pkgs.bash}/bin/bash
                    
                    # Find repository root (directory containing flake.nix)
                    REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
                    if [ $? -ne 0 ]; then
                      echo "Error: Not in a git repository"
                      exit 1
                    fi

                    # Check if Neo4j directory exists
                    NEO4J_DIR="$REPO_ROOT/data/neo4j"
                    if [ ! -d "$NEO4J_DIR" ]; then
                      echo "Error: Neo4j directory not found at $NEO4J_DIR"
                      exit 1
                    fi

                    DATA_DIR="$NEO4J_DIR/data"
                    LOGS_DIR="$NEO4J_DIR/logs"
                    CONF_DIR="$NEO4J_DIR/conf"
                    IMPORT_DIR="$NEO4J_DIR/import"
                    LIB_DIR="$NEO4J_DIR/lib"
                    PID_FILE="$NEO4J_DIR/neo4j.pid"
                    LOG_FILE="$LOGS_DIR/neo4j.log"

                    # Create required directories
                    mkdir -p "$DATA_DIR" "$LOGS_DIR" "$CONF_DIR" "$IMPORT_DIR" "$LIB_DIR"

                    # Only create config if it doesn't exist
                    if [ ! -f "$CONF_DIR/neo4j.conf" ]; then
                      cat > "$CONF_DIR/neo4j.conf" << EOF
          server.directories.data=$DATA_DIR
          server.directories.logs=$LOGS_DIR
          server.directories.import=$IMPORT_DIR
          server.directories.lib=$LIB_DIR
          server.memory.heap.initial_size=512m
          server.memory.heap.max_size=1G
          server.default_listen_address=127.0.0.1
          server.http.enabled=true
          server.http.listen_address=127.0.0.1:7474
          server.bolt.enabled=true
          server.bolt.listen_address=127.0.0.1:7687
          dbms.security.auth_enabled=false
          EOF
                    fi

                    # Check if Neo4j is already running
                    if [ -f "$PID_FILE" ]; then
                      PID=$(cat "$PID_FILE")
                      if kill -0 "$PID" 2>/dev/null; then
                        echo "Neo4j is already running (PID: $PID)"
                        exit 0
                      else
                        rm -f "$PID_FILE"
                      fi
                    fi

                    # Start Neo4j in background
                    echo "Starting Neo4j..."
                    NEO4J_CONF="$CONF_DIR" nohup ${pkgs.neo4j}/bin/neo4j console > "$LOG_FILE" 2>&1 &
                    PID=$!
                    echo $PID > "$PID_FILE"

                    # Wait for Neo4j to start
                    echo "Waiting for Neo4j to start..."
                    for i in {1..60}; do
                      if curl -s http://localhost:7474 >/dev/null; then
                        echo "Neo4j is running (PID: $PID)"
                        exit 0
                      fi
                      echo -n "."
                      sleep 2
                    done

                    echo
                    echo "Failed to start Neo4j - check logs at $LOG_FILE"
                    exit 1
        '';

        stopNeo4j = pkgs.writeScriptBin "stop-neo4j" ''
          #!${pkgs.bash}/bin/bash

          # Find repository root (directory containing flake.nix)
          REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
          if [ $? -ne 0 ]; then
            echo "Error: Not in a git repository"
            exit 1
          fi

          # Check if Neo4j directory exists
          NEO4J_DIR="$REPO_ROOT/data/neo4j"
          if [ ! -d "$NEO4J_DIR" ]; then
            echo "Error: Neo4j directory not found at $NEO4J_DIR"
            exit 1
          fi

          PID_FILE="$NEO4J_DIR/neo4j.pid"

          if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
              echo "Stopping Neo4j (PID: $PID)..."
              kill "$PID"
              rm -f "$PID_FILE"
              echo "Neo4j stopped"
            else
              echo "Neo4j is not running"
              rm -f "$PID_FILE"
            fi
          else
            echo "Neo4j is not running"
          fi
        '';

      in {
        devShells.default = pkgs.mkShell {
          buildInputs = devTools
            ++ [ startQdrant stopQdrant startNeo4j stopNeo4j ];

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
            echo "Database commands:"
            echo "  start-qdrant  - Start Qdrant in background"
            echo "  stop-qdrant   - Stop Qdrant"
            echo "  tail -f data/qdrant/qdrant.log  - View Qdrant logs"
            echo "  start-neo4j   - Start Neo4j in background"
            echo "  stop-neo4j    - Stop Neo4j"
            echo "  tail -f data/neo4j/neo4j.log    - View Neo4j logs"
          '';
        };
      });
}
