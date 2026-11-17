@echo off
setlocal EnableExtensions

set "ASSETS=assets"
set "REF=v2.0.4"
if defined GLANCE_ASSETS set "ASSETS=%GLANCE_ASSETS%"
if defined GLANCE_PLUGINS_REF set "REF=%GLANCE_PLUGINS_REF%"

set "BASE=https://raw.githubusercontent.com/rwendell/glance-plugins/%REF%"
set "TARGET_DIR=%ASSETS%\.plugins\plugin-manager"
set "TARGET=%TARGET_DIR%\plugin-manager.js"

set "ERR="
where curl.exe >nul 2>nul
if errorlevel 1 set "ERR=1"
if defined ERR echo curl.exe is required. Windows 10 and 11 include it.
if defined ERR exit /b 1

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo Downloading plugin-manager (%REF%)...
curl.exe -fsSL "%BASE%/plugins/plugin-manager/plugin-manager.js" -o "%TARGET%"
set "ERR="
if errorlevel 1 set "ERR=1"
if defined ERR echo Failed to download plugin-manager.
if defined ERR exit /b 1

set "NEED_FILE="
if not exist "%ASSETS%\plugins.jsonc" set "NEED_FILE=1"
if defined NEED_FILE echo {> "%ASSETS%\plugins.jsonc"
if defined NEED_FILE echo   "plugins": []>> "%ASSETS%\plugins.jsonc"
if defined NEED_FILE echo }>> "%ASSETS%\plugins.jsonc"
if defined NEED_FILE echo Created %ASSETS%\plugins.jsonc
set "NEED_FILE="

set "NEED_FILE="
if not exist "%ASSETS%\plugin-lock.json" set "NEED_FILE=1"
if defined NEED_FILE echo {> "%ASSETS%\plugin-lock.json"
if defined NEED_FILE echo   "version": 1,>> "%ASSETS%\plugin-lock.json"
if defined NEED_FILE echo   "plugins": {}>> "%ASSETS%\plugin-lock.json"
if defined NEED_FILE echo }>> "%ASSETS%\plugin-lock.json"
if defined NEED_FILE echo Created %ASSETS%\plugin-lock.json
set "NEED_FILE="

echo.
echo Plugin manager installed to %TARGET%
echo.
echo Add this to glance.yml:
echo.
echo document:
echo   head: ^|
echo     ^<script src="/assets/.plugins/plugin-manager/plugin-manager.js"^>^</script^>
exit /b 0
