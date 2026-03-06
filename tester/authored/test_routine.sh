#!/usr/bin/env bash
set -euo pipefail

# test_routing.sh
# Sends mock HTTP requests to the local unix socket to verify domain routing.

SOCKET_FP="../user/release/scratchpad/network_interface/RT_server.sock"

if [ ! -S "${SOCKET_FP}" ]; then
  echo "Error: Socket not found at ${SOCKET_FP}" >&2
  echo "Make sure the HTTP_server.js process is running in the user workspace." >&2
  exit 1
fi

echo "=== Testing Reasoning Technology domain ==="
curl --unix-socket "${SOCKET_FP}" \
  -H "Host: x6.reasoningtechnology.com" \
  http://localhost/

echo -e "\n\n=== Testing Thomas Walker Lynch domain ==="
curl --unix-socket "${SOCKET_FP}" \
  -H "Host: x6.thomas-walker-lynch.com" \
  http://localhost/

echo -e "\n\n=== Testing Unknown domain ==="
curl --unix-socket "${SOCKET_FP}" \
  -H "Host: nonexistent-domain.com" \
  http://localhost/
