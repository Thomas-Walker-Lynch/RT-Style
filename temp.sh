#!/usr/bin/env bash
set -euo pipefail

CLI(){
  local doc_dirs=$(find . -type d -name "document" -not -path "*/\.git/*" -not -path "*/shared/third_party/*")

  for doc_dir in $doc_dirs; do
    local clean_dir="${doc_dir#./}"
    
    local rel_root=""
    IFS='/' read -ra parts <<< "$clean_dir"
    for part in "${parts[@]}"; do
      rel_root="../${rel_root}"
    done
    
    local setup_file="${clean_dir}/setup.js"
    
    cat <<EOF > "${setup_file}"
window.RT_REPO_ROOT = "${rel_root}";
document.write('<script src="' + window.RT_REPO_ROOT + 'shared/style_directory_dict.js"></script>');
document.write('<script src="' + window.RT_REPO_ROOT + 'developer/authored/RT/core/loader.js"></script>');
document.write('<script src="' + window.RT_REPO_ROOT + 'developer/authored/RT/core/body_visibility_hidden.js"></script>');
EOF

    echo "Wrote ${setup_file} using RT_REPO_ROOT = '${rel_root}'"
  done
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  CLI "$@"
fi
