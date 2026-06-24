#!/usr/bin/env python3
import sys
import os
import stat
import shutil
from pathlib import Path

def deploy_RT_Style_indirect_locators(locator_dir_path):
    locator_dir = Path(locator_dir_path)
    if not locator_dir.is_dir():
        print(f"Error: Locator directory not found at {locator_dir_path}")
        sys.exit(1)

    indirect_js = locator_dir / "indirect.js"
    if not indirect_js.exists():
        print("Error: indirect.js missing in the specified directory.")
        sys.exit(1)

    repo_home = Path(os.environ.get("REPO_HOME", "."))
    IGNORED_DIRS = {".git"}

    for root, dirs, files in os.walk(repo_home):
        # Prune ignored directories in place
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        
        current_path = Path(root)
        if current_path.name.lower() == "document":
            target_file = current_path / "RT-Style_locator.js"
            
            # Eliminate permission denial on read-only artifacts
            if target_file.exists():
                target_file.chmod(target_file.stat().st_mode | stat.S_IWUSR)
            
            shutil.copyfile(indirect_js, target_file)
            print(f"Copied indirect.js -> {target_file}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 deploy_RT_Style_indirect_locators.py <path_to_Locator_directory>")
        sys.exit(1)
        
    deploy_RT_Style_indirect_locators(sys.argv[1])

