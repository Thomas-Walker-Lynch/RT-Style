(defun rt-format-buffer ()
  (interactive)
  (shell-command-on-region (point-min) (point-max)
                           "RT_Format pipe" t t))
