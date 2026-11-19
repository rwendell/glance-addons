Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

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
shell.Run """" & exe & """ --config """ & config & """", 0, False
