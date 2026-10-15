@echo off
title Snowy Display - Dev Compilation
call S:\snowy_display\scripts\project-env.cmd
cd /d S:\snowy_display
echo ========================================================
echo  Snowy Display Dev Build - Live Cargo Progress Terminal
echo ========================================================
call npm run dev
echo.
echo Build process exited.
pause
cmd /k
