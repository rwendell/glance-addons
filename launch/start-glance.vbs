Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Sub EnsureFolder(path)
    Dim parent
    If fso.FolderExists(path) Then Exit Sub
    parent = fso.GetParentFolderName(path)
    If parent <> "" Then EnsureFolder parent
    fso.CreateFolder path
End Sub

envFile = shell.ExpandEnvironmentStrings("%USERPROFILE%\.config\glance\glance.env")

If fso.FileExists(envFile) Then
    Set f = fso.OpenTextFile(envFile, 1)
    Do Until f.AtEndOfStream
        line = Trim(f.ReadLine())
        If line <> "" And Left(line, 1) <> "#" Then
            separator = InStr(line, "=")
            If separator > 0 Then
                key = Trim(Left(line, separator - 1))
                value = Trim(Mid(line, separator + 1))
                shell.Environment("PROCESS")(key) = value
            End If
        End If
    Loop
    f.Close
End If

exe = shell.ExpandEnvironmentStrings("%USERPROFILE%\.local\bin\glance.exe")
config = shell.ExpandEnvironmentStrings("%USERPROFILE%\.config\glance\glance.yml")
logDir = shell.ExpandEnvironmentStrings("%USERPROFILE%\.local\share\glance\logs")
logFile = logDir & "\glance.log"
EnsureFolder logDir

' Glance runs hidden and writes its output to glance.log.
shell.Run "cmd /c """"" & exe & """ --config """ & config & """ > """ & logFile & """ 2>&1""", 0, False
