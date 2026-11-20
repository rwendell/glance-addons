' Start Glance hidden with the widget variables from glance.env, appending
' stdout/stderr to the XDG state log.
Option Explicit

Dim sh, fso, home, envFile, exe, cfg, cfgDir, logDir, logFile, q, cmd, svc
Dim f, line, sep, key, value

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

home = sh.ExpandEnvironmentStrings("%USERPROFILE%")
exe = home & "\.local\bin\glance.exe"
cfgDir = home & "\.config\glance"
cfg = cfgDir & "\glance.yml"
envFile = cfgDir & "\glance.env"
logDir = home & "\.local\state\glance"
logFile = logDir & "\glance.log"

If Not fso.FileExists(exe) Then
    MsgBox "Glance not found:" & vbCrLf & exe, vbCritical, "Glance"
    WScript.Quit 1
End If

If Not fso.FileExists(cfg) Then
    MsgBox "Glance config not found:" & vbCrLf & cfg, vbCritical, "Glance"
    WScript.Quit 1
End If

' Widget variables (ANILIST_USER, GITHUB_USER, ...) are required for the config
' to parse, so load them into this process before Glance inherits the env.
If fso.FileExists(envFile) Then
    Set f = fso.OpenTextFile(envFile, 1)
    Do Until f.AtEndOfStream
        line = Trim(f.ReadLine())
        If LCase(Left(line, 7)) = "export " Then line = Trim(Mid(line, 8))
        If line <> "" And Left(line, 1) <> "#" And Left(line, 1) <> "'" Then
            sep = InStr(line, "=")
            If sep > 1 Then
                key = Trim(Left(line, sep - 1))
                value = Trim(Mid(line, sep + 1))
                If Len(value) >= 2 Then
                    If (Left(value, 1) = Chr(34) And Right(value, 1) = Chr(34)) Or _
                       (Left(value, 1) = "'" And Right(value, 1) = "'") Then
                        value = Mid(value, 2, Len(value) - 2)
                    End If
                End If
                If key <> "" And InStr(key, " ") = 0 Then
                    sh.Environment("PROCESS")(key) = value
                End If
            End If
        End If
    Loop
    f.Close
End If

' Create the log folder (and any missing parents) before redirecting into it.
EnsureFolder logDir

' Don't start a second copy.
Set svc = GetObject("winmgmts:\\.\root\cimv2")
If svc.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name='glance.exe'").Count > 0 Then
    WScript.Quit 0
End If

' Resolve any config-relative paths from the config directory.
sh.CurrentDirectory = cfgDir

q = Chr(34)
cmd = "cmd /c " & q & q & exe & q & _
      " --config " & q & cfg & q & _
      " >> " & q & logFile & q & " 2>&1" & q

' 0 = hidden window, False = don't wait for it to exit
sh.Run cmd, 0, False

Sub EnsureFolder(path)
    Dim parent
    If fso.FolderExists(path) Then Exit Sub
    parent = fso.GetParentFolderName(path)
    If parent <> "" Then EnsureFolder parent
    On Error Resume Next
    fso.CreateFolder path
    On Error GoTo 0
End Sub
