@echo off
setlocal EnableExtensions

set "ASSETS=assets"
set "REF=main"
if defined GLANCE_ASSETS set "ASSETS=%GLANCE_ASSETS%"
if defined GLANCE_PLUGINS_REF set "REF=%GLANCE_PLUGINS_REF%"

set "RAW=https://raw.githubusercontent.com/rwendell/glance-plugins/%REF%"
set "TARGET=%ASSETS%\plugin-manager.js"

set "ERR="
where curl.exe >nul 2>nul
if errorlevel 1 set "ERR=1"
if defined ERR echo curl.exe is required. Windows 10 and 11 include it.
if defined ERR exit /b 1

if not exist "%ASSETS%\plugins" mkdir "%ASSETS%\plugins"

echo Downloading plugin-manager (%REF%)...
curl.exe -fsSL "%RAW%/plugins/plugin-manager/dist/plugin-manager.js" -o "%TARGET%"
set "ERR="
if errorlevel 1 set "ERR=1"
if defined ERR echo Failed to download plugin-manager.
if defined ERR exit /b 1

set "NEED_FILE="
if not exist "%ASSETS%\plugins.json" set "NEED_FILE=1"
if defined NEED_FILE echo {> "%ASSETS%\plugins.json"
if defined NEED_FILE echo   "plugins": []>> "%ASSETS%\plugins.json"
if defined NEED_FILE echo }>> "%ASSETS%\plugins.json"
if defined NEED_FILE echo Created %ASSETS%\plugins.json
set "NEED_FILE="

echo.
echo Plugin manager installed to %TARGET%
echo.
echo Add this to glance.yml:
echo.
echo document: { head: '<script src="/assets/plugin-manager.js"></script>' }
echo.
echo Edit %ASSETS%\plugins.json to add plugins.
exit /b 0
