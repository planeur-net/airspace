#!/usr/bin/env bash
# Copyright (c) Microsoft Corporation.
# SPDX-License-Identifier: MIT
#
# Validate france-exp.txt and export france.geojson.
# Usage: bash src/validate-openair.sh

set -euo pipefail

# Resolve paths relative to this script rather than the caller's directory.
main() {
  local script_dir
  script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  cd -- "${script_dir}/../openaip-openair-parser"

  exec node ./dist/cli.js \
    --input-filepath ../france-exp.txt \
    --validate \
    --output-filepath ../france.geojson \
    --version 2.0 \
    --warn-if-expired
}

main "$@"
