@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Restore database dat_xe_ve_que...
echo Dong start-local.bat / phpMyAdmin neu dang mo.
echo.

set "MYSQL_EXE="
set "MYSQL_USER=root"
set "MYSQL_PASS="
if exist "%~dp0restore-db.local.bat" call "%~dp0restore-db.local.bat"

if not defined MYSQL_EXE call :find_mysql
if not defined MYSQL_EXE goto :no_mysql

echo Dung: "%MYSQL_EXE%"
echo User: %MYSQL_USER%
echo.

set "SQL_FILE=%~dp0database\dat_xe_ve_que_react_express_full_restore.sql"
if not exist "%SQL_FILE%" (
  echo Khong tim thay: %SQL_FILE%
  pause
  exit /b 1
)

echo Xoa database cu...
if defined MYSQL_PASS (
  "%MYSQL_EXE%" -u %MYSQL_USER% -p%MYSQL_PASS% -e "DROP DATABASE IF EXISTS dat_xe_ve_que;"
) else (
  "%MYSQL_EXE%" -u %MYSQL_USER% -e "DROP DATABASE IF EXISTS dat_xe_ve_que;"
)
if %ERRORLEVEL% NEQ 0 goto :drop_fail

echo Tao database moi...
if defined MYSQL_PASS (
  "%MYSQL_EXE%" -u %MYSQL_USER% -p%MYSQL_PASS% -e "CREATE DATABASE dat_xe_ve_que CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
) else (
  "%MYSQL_EXE%" -u %MYSQL_USER% -e "CREATE DATABASE dat_xe_ve_que CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
)
if %ERRORLEVEL% NEQ 0 (
  echo Tao database that bai.
  pause
  exit /b 1
)

echo Import bang va du lieu (UTF-8, khong dung more)...
set "TEMP_SQL=%TEMP%\dxvq_restore_%RANDOM%.sql"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0database\prepare-restore-import.ps1" -SourceSql "%SQL_FILE%" -OutSql "%TEMP_SQL%"
if %ERRORLEVEL% NEQ 0 (
  echo Tao file import tam that bai.
  pause
  exit /b 1
)
if defined MYSQL_PASS (
  "%MYSQL_EXE%" -u %MYSQL_USER% -p%MYSQL_PASS% --default-character-set=utf8mb4 dat_xe_ve_que < "%TEMP_SQL%"
) else (
  "%MYSQL_EXE%" -u %MYSQL_USER% --default-character-set=utf8mb4 dat_xe_ve_que < "%TEMP_SQL%"
)
set "IMPORT_ERR=%ERRORLEVEL%"
del "%TEMP_SQL%" 2>nul
if %IMPORT_ERR% NEQ 0 (
  echo Import that bai.
  pause
  exit /b 1
)

echo Restore thanh cong!
cd /d "%~dp0backend"
call node scripts/migrate.mjs
call npx prisma generate
call node scripts/fix-encoding.mjs
call node scripts/seed-pricing-test.mjs
echo.
echo.
set /p SEED=Chay seed 300 don + 20 tai xe? (Y/N): 
if /i "%SEED%"=="Y" (
  call node scripts/seed-test-data.mjs
)
echo Xong. Chay start-local.bat
pause
exit /b 0

:drop_fail
echo.
echo Khong xoa duoc DB — thuong do API dang ket noi.
echo   1. Ctrl+C o cua so start-local.bat
echo   2. Dong phpMyAdmin
echo   3. Chay lai restore-db.bat
pause
exit /b 1

:find_mysql
where mysql >nul 2>&1 && set "MYSQL_EXE=mysql" && exit /b 0
if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe" & exit /b 0
if exist "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" set "MYSQL_EXE=C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" & exit /b 0
for %%V in (8.4 8.0 5.7) do if exist "C:\Program Files\MySQL\MySQL Server %%V\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server %%V\bin\mysql.exe" & exit /b 0
for /d %%D in ("C:\Program Files\MariaDB *") do if exist "%%D\bin\mysql.exe" set "MYSQL_EXE=%%D\bin\mysql.exe" & exit /b 0
for /d %%D in ("C:\laragon\bin\mysql\mysql-*") do if exist "%%D\bin\mysql.exe" set "MYSQL_EXE=%%D\bin\mysql.exe" & exit /b 0
exit /b 1

:no_mysql
echo Khong tim thay mysql.exe — xem restore-db.local.bat.example
pause
exit /b 1
