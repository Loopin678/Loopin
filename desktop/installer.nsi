!include "MUI2.nsh"

Name "Loopin Desktop"
OutFile "LoopinSetup.exe"
InstallDir "$PROGRAMFILES64\Loopin"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN "$INSTDIR\loopin_desktop.exe"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "dist\*"
  
  CreateShortcut "$DESKTOP\Loopin.lnk" "$INSTDIR\loopin_desktop.exe"
  CreateDirectory "$SMPROGRAMS\Loopin"
  CreateShortcut "$SMPROGRAMS\Loopin\Loopin.lnk" "$INSTDIR\loopin_desktop.exe"
  
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Loopin.lnk"
  Delete "$SMPROGRAMS\Loopin\Loopin.lnk"
  RMDir "$SMPROGRAMS\Loopin"
  RMDir /r "$INSTDIR"
SectionEnd
