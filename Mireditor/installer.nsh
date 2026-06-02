; ─── Mireditor NSIS Custom Script ───
; Adds Windows Firewall rules so the app doesn't get blocked.
; Runs with admin privileges (requestedExecutionLevel=requireAdministrator).

!macro customInstall
  ; Add Windows Firewall inbound rule for Mireditor
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Mireditor"'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Mireditor" dir=in action=allow program="$INSTDIR\Mireditor.exe" enable=yes profile=any'
  
  ; Add Windows Firewall outbound rule for Mireditor
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Mireditor Outbound" dir=out action=allow program="$INSTDIR\Mireditor.exe" enable=yes profile=any'

  ; Add Windows Defender exclusion for the install directory (prevents false positive blocks)
  nsExec::ExecToLog 'powershell -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue"'
!macroend

!macro customUnInstall
  ; Remove firewall rules on uninstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Mireditor"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Mireditor Outbound"'

  ; Remove Defender exclusion on uninstall
  nsExec::ExecToLog 'powershell -Command "Remove-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue"'
!macroend
