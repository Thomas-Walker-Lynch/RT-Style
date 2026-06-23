#!/usr/bin/env python3
import sys
import os
import stat
import shutil
from pathlib import Path

def deploy_internal_locators(locator_dir_path):
    locator_dir = Path(locator_dir_path)
    if not locator_dir.is_dir():
        print(f"Error: Locator directory not found at {locator_dir_path}")
        sys.exit(1)

    immediate_js = locator_dir / "immediate.js"
    direct_js = locator_dir / "direct.js"

    if not immediate_js.exists() or not direct_js.exists():
        print("Error: Source locator files missing in the specified directory.")
        sys.exit(1)

    repo_home = Path(os.environ.get("REPO_HOME", "."))
    IGNORED_DIRS = {".git", "scratchpad", "consumer"}

    for root, dirs, files in os.walk(repo_home):
        # Prune ignored directories in place to prevent descending into them
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        
        current_path = Path(root)
        if current_path.name.lower() == "document":
            target_file = current_path / "RT-Style_locator.js"
            
            # Evaluate the path to determine the correct structural locator
            if "developer/authored/Manuscript" in current_path.as_posix():
                source_file = immediate_js
            else:
                source_file = direct_js

            # Eliminate permission denial on read-only consumer artifacts
            if target_file.exists():
                target_file.chmod(target_file.stat().st_mode | stat.S_IWUSR)
            
            shutil.copyfile(source_file, target_file)
            print(f"Copied {source_file.name} -> {target_file}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 deploy_internal_locators.py <path_to_Locator_directory>")
        sys.exit(1)
    
    deploy_internal_locators(sys.argv[1])
