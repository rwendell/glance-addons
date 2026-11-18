@echo off
setlocal EnableExtensions

set "CONFIG="
if defined XDG_CONFIG_HOME set "CONFIG=%XDG_CONFIG_HOME%\glance"
if not defined CONFIG set "CONFIG=%USERPROFILE%\.config\glance"
if defined GLANCE_CONFIG set "CONFIG=%GLANCE_CONFIG%"

set "REF=main"
if defined GLANCE_PLUGINS_REF set "REF=%GLANCE_PLUGINS_REF%"

for %%I in ("%CONFIG%") do set "CONFIG=%%~fI"

set "ASSETS=%CONFIG%\assets"
set "PLUGINS=%CONFIG%\plugins.json"
set "SERVED=%ASSETS%\plugins.json"
set "TARGET=%ASSETS%\plugin-manager.js"
set "RAW=https://raw.githubusercontent.com/rwendell/glance-plugins/%REF%"

set "ERR="
where curl.exe >nul 2>nul
if errorlevel 1 set "ERR=1"
if defined ERR echo curl.exe is required. Windows 10 and 11 include it.
if defined ERR exit /b 1

if not exist "%CONFIG%" mkdir "%CONFIG%"
if not exist "%ASSETS%" mkdir "%ASSETS%"

echo Downloading plugin-manager (%REF%)...
curl.exe -fsSL "%RAW%/plugins/plugin-manager/dist/plugin-manager.js" -o "%TARGET%"
set "ERR="
if errorlevel 1 set "ERR=1"
if defined ERR echo Failed to download plugin-manager.
if defined ERR exit /b 1

if not exist "%PLUGINS%" (
    if exist "%SERVED%" (
        move "%SERVED%" "%PLUGINS%" >nul
        echo Moved %SERVED% to %PLUGINS%
    ) else (
        echo {> "%PLUGINS%"
        echo   "plugins": []>> "%PLUGINS%"
        echo }>> "%PLUGINS%"
        echo Created %PLUGINS%
    )
)

if not exist "%SERVED%" (
    mklink "%SERVED%" "%PLUGINS%" >nul 2>nul
    if errorlevel 1 (
        mklink /H "%SERVED%" "%PLUGINS%" >nul 2>nul
        if errorlevel 1 (
            copy /y "%PLUGINS%" "%SERVED%" >nul
            echo Warning: could not create a link at %SERVED%.
            echo Created a copy instead. Delete that file and run this installer
            echo again after enabling Developer Mode or running as Administrator.
        ) else (
            echo Created hard link %SERVED% to %PLUGINS%
        )
    ) else (
        echo Linked %SERVED% to %PLUGINS%
    )
)

echo.
echo Plugin manager installed to %TARGET%
echo Plugin config: %PLUGINS%
echo.
echo Add this to glance.yml:
echo.
echo server:
echo   assets-path: %ASSETS%
echo.
echo document:
echo   head: ^|
echo     ^<script src="/assets/plugin-manager.js"^>^</script^>
echo.
echo Edit %PLUGINS% to add plugins.
exit /b 0
