#!/usr/bin/env python3
# -*- mode: python; coding: utf-8; python-indent-offset: 2; indent-tabs-mode: nil -*-

import os ,sys

def process_file(file_path ,replacements) -> bool:
  try:
    with open(file_path ,"r" ,encoding="utf-8") as f:
      content = f.read()
  except UnicodeDecodeError:
    return False

  new_content = content
  for old_str ,new_str in replacements:
    new_content = new_content.replace(old_str ,new_str)

  if new_content != content:
    with open(file_path ,"w" ,encoding="utf-8") as f:
      f.write(new_content)
    return True
  return False

def work(root_dir: str) -> list[str]:
  replacements = [
    ("shared/linked-project" ,"shared/linked-project")
    ,("linked-project/" ,"linked-project/")
    ,("how-to_release.html" ,"how-to_release.html")
    ,("naming_file-and-directory.html" ,"naming_file-and-directory.html")
    ,("format_RT-code.html" ,"format_RT-code.html")
    ,("format_RT-code.html" ,"format_RT-code.html")
    ,("format_RT-code-Lisp.html" ,"format_RT-code-Lisp.html")
    ,("single-file_C-module-and-namespace.html" ,"single-file_C-module-and-namespace.html")
    ,("developer/tool/do-all" ,"developer/tool/do-all")
    ,("introduction_Harmony.html" ,"introduction_Harmony.html")
    ,("role-and-workflow_product-development.html" ,"role-and-workflow_product-development.html")
    ,("role-and-workflow_product-development.html" ,"role-and-workflow_product-development.html")
    ,("role-and-workflow_product-maintenance.html" ,"role-and-workflow_product-maintenance.html")
    ,("installation_Python.org" ,"installation_Python.org")
    ,("installation_generic.org" ,"installation_generic.org")
    ,("dictionary_style-directory.js" ,"dictionary_style-directory.js")
    ,("target_kernel-module.mk" ,"target_kernel-module.mk")
    ,("tester/RT-formatter" ,"tester/RT-formatter")
    ,("RT-formatter pipe" ,"RT-formatter pipe")
    ,("RT-formatter pipe" ,"RT-formatter pipe")
    ,("RT-formatter-buffer" ,"RT-formatter-buffer")
    ,("RT-formatter-buffer" ,"RT-formatter-buffer")
    ,("RT-formatter-buffer" ,"RT-formatter-buffer")
    ,("RT-formatter-buffer" ,"RT-formatter-buffer")
    ,("\"RTfmt\"" ,"\"RT-formatter\"")
    ,("\"RTfmt0\"" ,"\"RT-formatter\"")
    ,("\"RT_format\"" ,"\"RT-formatter\"")
    ,("RT-formatter formatting" ,"RT-formatter formatting")
    ,("RT-formatter failed" ,"RT-formatter failed")
    ,("RT-formatter formatting" ,"RT-formatter formatting")
    ,("RT-formatter failed" ,"RT-formatter failed")
    ,("data_test-0.c" ,"data_test-0.c")
    ,("data_test-1.py" ,"data_test-1.py")
    ,("RT-formatter.el" ,"RT-formatter.el")
    ,("RT-formatter.el" ,"RT-formatter.el")
    ,("RT-formatter.el" ,"RT-formatter.el")
  ]

  changed_files = []
  
  for dirpath ,dirnames ,filenames in os.walk(root_dir):
    path_parts = dirpath.split(os.sep)
    if ".git" in path_parts or "scratchpad" in path_parts:
      continue
      
    for fn in filenames:
      if fn.endswith(".tar") or fn.endswith(".tar.gz") or fn.endswith(".zip"):
        continue
        
      fp = os.path.join(dirpath ,fn)
      if process_file(fp ,replacements):
        changed_files.append(fp)
        
  return changed_files

def CLI(argv=None) -> int:
  root_dir = "."
  print(f"Scanning '{root_dir}' for outdated internal references...")
  changed = work(root_dir)
  
  if not changed:
    print("No references needed updating.")
  else:
    print(f"Updated internal references in {len(changed)} files:")
    for fp in changed:
      print(f"  {fp}")
      
  return 0

if __name__ == "__main__":
  sys.exit(CLI())
