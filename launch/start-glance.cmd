@echo off
setlocal
set "ENV_FILE=%USERPROFILE%\.config\glance\glance.env"

if exist "%ENV_FILE%" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENV_FILE%") do set "%%A=%%B"
)

"%USERPROFILE%\.local\bin\glance.exe" --config "%USERPROFILE%\.config\glance\glance.yml"
