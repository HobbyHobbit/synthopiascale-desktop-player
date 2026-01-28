; Custom NSIS installer script for SynthopiaScale Desktop Visualizer
; This script adds screensaver installation support

!macro customInstall
  ; Create screensaver by copying the exe and renaming to .scr
  CopyFiles "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "$WINDIR\System32\SynthopiaScale.scr"
  
  ; Register screensaver in registry
  WriteRegStr HKCU "Control Panel\Desktop" "SCRNSAVE.EXE" "$WINDIR\System32\SynthopiaScale.scr"
  
  ; Add context menu entry for "Set as Screensaver"
  WriteRegStr HKCR "Applications\SynthopiaScale.scr\shell\open\command" "" '"$WINDIR\System32\SynthopiaScale.scr" /s'
!macroend

!macro customUnInstall
  ; Remove screensaver
  Delete "$WINDIR\System32\SynthopiaScale.scr"
  
  ; Clean up registry entries
  DeleteRegValue HKCU "Control Panel\Desktop" "SCRNSAVE.EXE"
  DeleteRegKey HKCR "Applications\SynthopiaScale.scr"
!macroend
