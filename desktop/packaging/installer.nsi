; Loopin Desktop installer. Built by packaging/build-windows.sh, which passes:
;   VERSION     e.g. 0.1.0
;   SOURCE_DIR  folder with loopin_desktop.exe and everything windeployqt copied
;   OUT_FILE    path of the installer to write
!include "MUI2.nsh"

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!ifndef SOURCE_DIR
  !define SOURCE_DIR "dist"
!endif
!ifndef OUT_FILE
  !define OUT_FILE "LoopinSetup.exe"
!endif

!define APP_NAME "Loopin"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Loopin"

Name "${APP_NAME} ${VERSION}"
OutFile "${OUT_FILE}"
Unicode True
RequestExecutionLevel admin
InstallDir "$PROGRAMFILES64\Loopin"
InstallDirRegKey HKLM "${UNINSTALL_KEY}" "InstallLocation"
SetCompressor /SOLID lzma

!define MUI_ICON "${SOURCE_DIR}\loopin.ico"
!define MUI_UNICON "${SOURCE_DIR}\loopin.ico"
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\loopin_desktop.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Start Loopin"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "FileDescription" "${APP_NAME} installer"
VIAddVersionKey "LegalCopyright" "Loopin"

Section "Install"
  SetShellVarContext all
  ; Replace files from an older version cleanly
  RMDir /r "$INSTDIR\qml"
  RMDir /r "$INSTDIR\plugins"

  SetOutPath "$INSTDIR"
  File /r "${SOURCE_DIR}\*"

  CreateDirectory "$SMPROGRAMS\Loopin"
  CreateShortcut "$SMPROGRAMS\Loopin\Loopin.lnk" "$INSTDIR\loopin_desktop.exe" "" "$INSTDIR\loopin.ico"
  CreateShortcut "$SMPROGRAMS\Loopin\Uninstall Loopin.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Loopin.lnk" "$INSTDIR\loopin_desktop.exe" "" "$INSTDIR\loopin.ico"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; "Apps & features" entry
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "Publisher" "Loopin"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\loopin.ico"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext all
  Delete "$DESKTOP\Loopin.lnk"
  RMDir /r "$SMPROGRAMS\Loopin"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "${UNINSTALL_KEY}"
SectionEnd
