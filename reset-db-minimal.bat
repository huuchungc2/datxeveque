@echo off
REM Reset DB sach: import dump + chi 1 admin + 2 tai xe (khong don/chuyen thua)
call "%~dp0restore-db.bat" minimal
