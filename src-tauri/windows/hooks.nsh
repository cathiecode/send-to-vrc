!macro NSIS_HOOK_POSTINSTALL
    CreateShortCut "$APPDATA\Microsoft\Windows\SendTo\SendToVRC.lnk" "$INSTDIR\send-to-vrc.exe"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
    Delete "$APPDATA\Microsoft\Windows\SendTo\SendToVRC.lnk"
!macroend
