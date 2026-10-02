!define MARKDOWN_VIEWER_PROGID "MarkdownViewer.Document"

!macro NSIS_HOOK_POSTINSTALL
  ; Offer Markdown Viewer in Open with without replacing the user's default app.
  WriteRegStr SHCTX "Software\Classes\${MARKDOWN_VIEWER_PROGID}" "" "Markdown document"
  WriteRegDWORD SHCTX "Software\Classes\${MARKDOWN_VIEWER_PROGID}" "AllowSilentDefaultTakeOver" 1
  WriteRegStr SHCTX "Software\Classes\${MARKDOWN_VIEWER_PROGID}\DefaultIcon" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0"
  WriteRegStr SHCTX "Software\Classes\${MARKDOWN_VIEWER_PROGID}\shell\open\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
  WriteRegStr SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe" "FriendlyAppName" "Markdown Viewer"
  WriteRegStr SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe\shell\open\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
  WriteRegStr SHCTX "Software\Classes\.md\OpenWithProgids" "${MARKDOWN_VIEWER_PROGID}" ""
  WriteRegStr SHCTX "Software\Classes\.markdown\OpenWithProgids" "${MARKDOWN_VIEWER_PROGID}" ""
  WriteRegStr SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".md" ""
  WriteRegStr SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".markdown" ""
  !insertmacro UPDATEFILEASSOC
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegValue SHCTX "Software\Classes\.md\OpenWithProgids" "${MARKDOWN_VIEWER_PROGID}"
  DeleteRegValue SHCTX "Software\Classes\.markdown\OpenWithProgids" "${MARKDOWN_VIEWER_PROGID}"
  DeleteRegKey SHCTX "Software\Classes\${MARKDOWN_VIEWER_PROGID}"
  DeleteRegKey SHCTX "Software\Classes\Applications\${MAINBINARYNAME}.exe"
  !insertmacro UPDATEFILEASSOC
!macroend
