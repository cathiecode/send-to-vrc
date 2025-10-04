!define ASSOC_PROGID "SuperNeko.SendToVRC"
!define ASSOC_VERB "SendToVRC"
!define ASSOC_APPEXE "send-to-vrc.exe"

!macro ASSOC_EXT_MACRO ASSOC_EXT
    # Register file type
    WriteRegStr ShCtx "Software\Classes\${ASSOC_PROGID}\DefaultIcon" "" "$INSTDIR\${ASSOC_APPEXE},0"
    ;WriteRegStr ShCtx "Software\Classes\${ASSOC_PROGID}\shell\${ASSOC_VERB}" "" "Send to VRC" [Optional]
    ;WriteRegStr ShCtx "Software\Classes\${ASSOC_PROGID}\shell\${ASSOC_VERB}" "MUIVerb" "@$INSTDIR\${ASSOC_APPEXE},-42" ; WinXP+ [Optional] Localizable verb display name
    WriteRegStr ShCtx "Software\Classes\${ASSOC_PROGID}\shell\${ASSOC_VERB}\command" "" '"$INSTDIR\${ASSOC_APPEXE}" "%1"'
    WriteRegStr ShCtx "Software\Classes\${ASSOC_EXT}" "" "${ASSOC_PROGID}"

    # Register "Open With" [Optional]
    WriteRegNone ShCtx "Software\Classes\${ASSOC_EXT}\OpenWithList" "${ASSOC_APPEXE}" ; Win2000+ [Optional]
    WriteRegStr ShCtx "Software\Classes\Applications\${ASSOC_APPEXE}\shell\open\command" "" '"$INSTDIR\${ASSOC_APPEXE}" "%1"'
    WriteRegStr ShCtx "Software\Classes\Applications\${ASSOC_APPEXE}" "FriendlyAppName" "Send to VRC" ; [Optional]
    WriteRegStr ShCtx "Software\Classes\Applications\${ASSOC_APPEXE}" "ApplicationCompany" "SuperNekoya" ; [Optional]
    WriteRegNone ShCtx "Software\Classes\Applications\${ASSOC_APPEXE}\SupportedTypes" "${ASSOC_EXT}" ; [Optional] Only allow "Open With" with specific extension(s) on WinXP+
!macroend

!macro UN_ASSOC_EXT_MACRO ASSOC_EXT
    # Unregister file type
    ClearErrors
    DeleteRegKey ShCtx "Software\Classes\${ASSOC_PROGID}\shell\${ASSOC_VERB}"
    DeleteRegKey /IfEmpty ShCtx "Software\Classes\${ASSOC_PROGID}\shell"
    ${IfNot} ${Errors}
        DeleteRegKey ShCtx "Software\Classes\${ASSOC_PROGID}\DefaultIcon"
    ${EndIf}
    ReadRegStr $0 ShCtx "Software\Classes\${ASSOC_EXT}" ""
    DeleteRegKey /IfEmpty ShCtx "Software\Classes\${ASSOC_PROGID}"
    ${IfNot} ${Errors}
    ${AndIf} $0 == "${ASSOC_PROGID}"
        DeleteRegValue ShCtx "Software\Classes\${ASSOC_EXT}" ""
        DeleteRegKey /IfEmpty ShCtx "Software\Classes\${ASSOC_EXT}"
    ${EndIf}

    # Unregister "Open With"
    DeleteRegKey ShCtx "Software\Classes\Applications\${ASSOC_APPEXE}"
    DeleteRegValue ShCtx "Software\Classes\${ASSOC_EXT}\OpenWithList" "${ASSOC_APPEXE}"
    DeleteRegKey /IfEmpty ShCtx "Software\Classes\${ASSOC_EXT}\OpenWithList"
    DeleteRegKey /IfEmpty ShCtx "Software\Classes\${ASSOC_EXT}\OpenWithProgids"
    DeleteRegKey /IfEmpty  ShCtx "Software\Classes\${ASSOC_EXT}"

!macroend

!macro NSIS_HOOK_POSTINSTALL
    CreateShortCut "$APPDATA\Microsoft\Windows\SendTo\SendToVRC.lnk" "$INSTDIR\send-to-vrc.exe"
    !insertmacro ASSOC_EXT_MACRO ".avif"
    !insertmacro ASSOC_EXT_MACRO ".bmp"
    !insertmacro ASSOC_EXT_MACRO ".exr"
    !insertmacro ASSOC_EXT_MACRO ".gif"
    !insertmacro ASSOC_EXT_MACRO ".jpeg"
    !insertmacro ASSOC_EXT_MACRO ".jpg"
    !insertmacro ASSOC_EXT_MACRO ".png"
    !insertmacro ASSOC_EXT_MACRO ".pnm"
    !insertmacro ASSOC_EXT_MACRO ".tiff"
    !insertmacro ASSOC_EXT_MACRO ".webp"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
    Delete "$APPDATA\Microsoft\Windows\SendTo\SendToVRC.lnk"
    !insertmacro UN_ASSOC_EXT_MACRO ".avif"
    !insertmacro UN_ASSOC_EXT_MACRO ".bmp"
    !insertmacro UN_ASSOC_EXT_MACRO ".exr"
    !insertmacro UN_ASSOC_EXT_MACRO ".gif"
    !insertmacro UN_ASSOC_EXT_MACRO ".jpeg"
    !insertmacro UN_ASSOC_EXT_MACRO ".jpg"
    !insertmacro UN_ASSOC_EXT_MACRO ".png"
    !insertmacro UN_ASSOC_EXT_MACRO ".pnm"
    !insertmacro UN_ASSOC_EXT_MACRO ".tiff"
    !insertmacro UN_ASSOC_EXT_MACRO ".webp"
!macroend
