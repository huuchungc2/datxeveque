@echo off
echo Restore database dat_xe_ve_que...
echo Can MySQL dang chay va user root (sua lenh neu khac).
echo.
set SQL_FILE=%~dp0database\dat_xe_ve_que_react_express_full_restore.sql
mysql -u root < "%SQL_FILE%"
if %ERRORLEVEL% EQU 0 (
  echo Restore thanh cong!
  cd /d %~dp0backend
  call node scripts/migrate.mjs
  call npx prisma generate
  echo Chay test: npm run test:acceptance
) else (
  echo Restore that bai. Kiem tra MySQL va duong dan mysql.exe trong PATH.
)
pause
