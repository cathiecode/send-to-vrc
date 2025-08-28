;-------------------------------------------------------------------------------
; Includes
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "x64.nsh"

;-------------------------------------------------------------------------------
; Constants
!define PRODUCT_NAME "Send to VRC"
!define PRODUCT_DESCRIPTION "Add send item to context menu of explorer"
!define COPYRIGHT "Copyright (C) 2025 SuperNekoya"
!define PRODUCT_VERSION "0.1.0"
!define SETUP_VERSION 0.1.0

;-------------------------------------------------------------------------------
; Attributes
Name "Send to VRC Installer"
OutFile "Setup.exe"
InstallDir "$PROGRAMFILES64\SendToVRC"
InstallDirRegKey HKCU "Software\SuperNekoya\SendToVRC" ""
RequestExecutionLevel highest ; user|highest|admin

;-------------------------------------------------------------------------------
; Version Info
;VIProductVersion "${PRODUCT_VERSION}"
;VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
;VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"
;VIAddVersionKey "FileDescription" "${PRODUCT_DESCRIPTION}"
;VIAddVersionKey "LegalCopyright" "${COPYRIGHT}"
;VIAddVersionKey "FileVersion" "${SETUP_VERSION}"

;-------------------------------------------------------------------------------
; Modern UI Appearance
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\orange-install.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\orange.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\orange.bmp"
!define MUI_FINISHPAGE_NOAUTOCLOSE

;-------------------------------------------------------------------------------
; Installer Pages
!insertmacro MUI_PAGE_WELCOME
;!insertmacro MUI_PAGE_LICENSE "${NSISDIR}\Docs\Modern UI\License.txt"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

;-------------------------------------------------------------------------------
; Uninstaller Pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

;-------------------------------------------------------------------------------
; Languages
!insertmacro MUI_LANGUAGE "English"

;-------------------------------------------------------------------------------
; Installer Sections
Section "SendToVRC" MyApp
	SetOutPath $INSTDIR
	File "target\release\send-to-vrc.exe"
	File "THIRDPARTY"
    File "LICENSE"
    CreateShortCut "$APPDATA\Microsoft\Windows\SendTo\SendToVRC.lnk" "$INSTDIR\send-to-vrc.exe"
    CreateShortCut "$APPDATA\Microsoft\Windows\Start Menu\Programs\SendToVRC.lnk" "$INSTDIR\send-to-vrc.exe" "config"
	WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

;-------------------------------------------------------------------------------
; Uninstaller Sections
Section "Uninstall"
    Delete "$INSTDIR\send-to-vrc.exe"
    Delete "$INSTDIR\THIRDPARTY"
    Delete "$INSTDIR\LICENSE"
    Delete "$INSTDIR\Uninstall.exe"
	RMDir "$INSTDIR"
    Delete "$APPDATA\Microsoft\Windows\SendTo\SendToVRC.lnk"
    Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\SendToVRC.lnk"
	DeleteRegKey /ifempty HKCU "Software\SuperNekoya\SendToVRC"
SectionEnd
