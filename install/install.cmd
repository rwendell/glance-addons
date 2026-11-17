@echo off
setlocal EnableExtensions

set "ASSETS=assets"
set "REF=v2.1.0"
if defined GLANCE_ASSETS set "ASSETS=%GLANCE_ASSETS%"
if defined GLANCE_PLUGINS_REF set "REF=%GLANCE_PLUGINS_REF%"

set "RAW=https://raw.githubusercontent.com/rwendell/glance-plugins/%REF%"
set "RELEASE=https://github.com/rwendell/glance-plugins/releases/download/%REF%"
set "TARGET_DIR=%ASSETS%\.plugins\plugin-manager"
set "MANAGER=%TARGET_DIR%\plugin-manager.js"
set "UPDATER=%TARGET_DIR%\glance-plugins.exe"

set "ARCH=amd64"
if /I "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=arm64"

set "ERR="
where curl.exe >nul 2>nul
if errorlevel 1 set "ERR=1"
if defined ERR echo curl.exe is required. Windows 10 and 11 include it.
if defined ERR exit /b 1

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo Downloading plugin-manager (%REF%)...
curl.exe -fsSL "%RAW%/plugins/plugin-manager/plugin-manager.js" -o "%MANAGER%"
set "ERR="
if errorlevel 1 set "ERR=1"
if defined ERR echo Failed to download plugin-manager.
if defined ERR exit /b 1

echo Downloading updater (%REF%)...
curl.exe -fsSL "%RELEASE%/glance-plugins-windows-%ARCH%.exe" -o "%UPDATER%"
set "ERR="
if errorlevel 1 set "ERR=1"
if defined ERR echo Failed to download the updater.
if defined ERR exit /b 1

set "NEED_FILE="
if not exist "%ASSETS%\plugins.jsonc" set "NEED_FILE=1"
if defined NEED_FILE echo {> "%ASSETS%\plugins.jsonc"
if defined NEED_FILE echo   "plugins": []>> "%ASSETS%\plugins.jsonc"
if defined NEED_FILE echo }>> "%ASSETS%\plugins.jsonc"
if defined NEED_FILE echo Created %ASSETS%\plugins.jsonc
set "NEED_FILE="

echo.
echo Plugin manager installed to %MANAGER%
echo Updater installed to %UPDATER%
echo.
echo Add this to glance.yml:
echo.
echo document:
echo   head: ^|
echo     ^<script src="/assets/.plugins/plugin-manager/plugin-manager.js"^>^</script^>
echo.
echo Run the updater after editing plugins.jsonc:
echo.
echo   %UPDATER% update
exit /b 0
