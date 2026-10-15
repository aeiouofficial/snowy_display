@echo off
title Snowy Display
call S:\snowy_display\scripts\project-env.cmd
cd /d S:\snowy_display
start "" S:\snowy_display\.build\target\release\snowy-display.exe
