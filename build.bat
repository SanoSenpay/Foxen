@echo off
chcp 65001 >nul
title Foxen Extension Builder

echo ========================================================
echo               FOXEN EXTENSION BUILDER
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] ОШИБКА: Node.js не найден в системе!
    echo Установите Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/2] Сборка релизных архивов расширения...
node build.js
if %errorlevel% neq 0 (
    echo.
    echo [X] Ошибка при сборке расширения!
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Проверка чистоты репозитория Git...
node check-git.js

echo.
echo ========================================================
echo [OK] Сборка успешно завершена!
echo.
echo Готовые файлы для загрузки на Mozilla AMO:
echo   - dist\foxen-latest.zip
echo   - web-ext-artifacts\foxen-3.4.0.zip
echo ========================================================
echo.
pause