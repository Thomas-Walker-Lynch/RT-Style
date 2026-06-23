#!/usr/bin/env bash
# deploy_internal_locators.sh

LOCATOR_DIR="$1"

if [[ -z "$LOCATOR_DIR" || ! -d "$LOCATOR_DIR" ]]; then
    echo "Error: Must provide a valid path to the Locator directory."
    echo "Usage: $0 <path_to_Locator_directory>"
    exit 1
fi

# Default to current directory if REPO_HOME is not set
TARGET_BASE="${REPO_HOME:-.}"

# Walk the tree, pruning .git, scratchpad, and consumer
find "$TARGET_BASE" -type d \( -name ".git" -o -name "scratchpad" -o -name "consumer" \) -prune -o -type d -iname "document" -print | while IFS= read -r doc_dir; do
    
    # Evaluate the path to determine the correct structural locator
    if [[ "$doc_dir" == *"developer/authored/Manuscript"* ]]; then
        cp "$LOCATOR_DIR/immediate.js" "$doc_dir/RT-Style_locator.js"
        echo "Copied immediate.js -> $doc_dir/RT-Style_locator.js"
    else
        cp "$LOCATOR_DIR/direct.js" "$doc_dir/RT-Style_locator.js"
        echo "Copied direct.js    -> $doc_dir/RT-Style_locator.js"
    fi
    
done

echo "Internal locator deployment complete."
