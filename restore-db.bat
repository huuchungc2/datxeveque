@echo off
echo Restore database dat_xe_ve_que...
echo Can MySQL dang chay va user root (sua lenh neu khac).
echo.
set SQL_FILE=%~dp0dat_xe_ve_que_FULL_RESTORE_WORKING.sql
mysql -u root < "%SQL_FILE%"
if %ERRORLEVEL% EQU 0 (
  echo Restore thanh cong!
  cd /d %~dp0backend
  call npx prisma generate
) else (
  echo Restore that bai. Kiem tra MySQL va duong dan mysql.exe trong PATH.
)
pause
