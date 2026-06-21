#!/usr/bin/env -S python3 -B
# -*- mode: python; coding: utf-8; python-indent-offset: 2; indent-tabs-mode: nil -*-

import os ,sys

def CLI(argv=None) -> int:
  # Ordered list of renames: files first, then directories to preserve paths
  substitutions = [
    # Administrator
    ("administrator/document/how-to_release.html" ,"administrator/document/how-to_release.html")
    
    # Developer
    ,("developer/document/naming_file-and-directory.html" ,"developer/document/naming_file-and-directory.html")
    ,("developer/document/format_RT-code.html" ,"developer/document/format_RT-code.html")
    ,("developer/document/single-file_C-module-and-namespace.html" ,"developer/document/single-file_C-module-and-namespace.html")
    ,("developer/tool/do-all" ,"developer/tool/do-all")
    
    # Top-level documents
    ,("document/introduction_Harmony.html" ,"document/introduction_Harmony.html")
    ,("document/role-and-workflow_product-development.html" ,"document/role-and-workflow_product-development.html")
    ,("document/role-and-workflow_product-maintenance.html" ,"document/role-and-workflow_product-maintenance.html")
    
    # Shared tools and documents
    ,("shared/document/installation_Python.org" ,"shared/document/installation_Python.org")
    ,("shared/document/installation_generic.org" ,"shared/document/installation_generic.org")
    ,("shared/dictionary_style-directory.js" ,"shared/dictionary_style-directory.js")
    ,("shared/tool/RTfmt" ,"shared/tool/RT-formatter")
    ,("shared/tool/RT-formatter.el" ,"shared/tool/RT-formatter.el")
    ,("shared/tool/makefile/target_kernel-module.mk" ,"shared/tool/makefile/target_kernel-module.mk")
    
    # Tester files (referenced by the old directory name before it is renamed)
    ,("tester/RT-formatter/RT-formatter.el" ,"tester/RT-formatter/RT-formatter.el")
    ,("tester/RT-formatter/RT-formatter.el" ,"tester/RT-formatter/RT-formatter_alt.el")
    ,("tester/RT-formatter/RTfmt" ,"tester/RT-formatter/RT-formatter")
    ,("tester/RT-formatter/RT-formatter.el" ,"tester/RT-formatter/RT-formatter_script.el")
    ,("tester/RT-formatter/RTfmt_with_compare" ,"tester/RT-formatter/RT-formatter_with-compare")
    ,("tester/RT-formatter/RTfmt_with_compare.el" ,"tester/RT-formatter/RT-formatter_with-compare.el")
    ,("tester/RT-formatter/data_test-0.c" ,"tester/RT-formatter/data_test-0.c")
    ,("tester/RT-formatter/data_test-1.py" ,"tester/RT-formatter/data_test-1.py")
    
    # Directories
    ,("shared/linked-project" ,"shared/linked-project")
    ,("tester/RT-formatter" ,"tester/RT-formatter")
  ]

  for src ,dst in substitutions:
    if not os.path.exists(src):
      print(f"Skipping (not found): {src}")
      continue
    
    if os.path.exists(dst):
      print(f"Warning: Destination {dst} already exists. Skipping rename for {src}.")
      continue
      
    try:
      os.rename(src ,dst)
      print(f"Renamed: {src} -> {dst}")
    except Exception as e:
      print(f"Error renaming {src} to {dst}: {e}")

  return 0

if __name__ == "__main__":
  sys.exit(CLI())

