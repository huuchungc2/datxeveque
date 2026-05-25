@echo off
echo ========================================
echo   Dat Xe Ve Que - Local Development
echo ========================================
echo.
echo Demo accounts:
echo   Admin:    0900000000 / admin123
echo   Tai xe:   0900000001 / taixe123
echo   Khach:    0900000002 / khach123
echo.
echo Backend:  http://localhost:4002
echo Frontend: http://localhost:5173
echo Admin dispatch: http://localhost:5173/admin/dispatch
echo.
echo Dien thoai cung Wi-Fi: mo Frontend bang IP may tinh (khong dung localhost)
echo   Vi du: http://192.168.1.10:5173  — API tu dong: http://192.168.1.10:4002/api
echo   Neu van loi: Windows Firewall - cho phep Node/port 4002 va 5173
echo.

start "DXVQ Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
start "DXVQ Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Da khoi dong backend va frontend trong 2 cua so moi.
