@echo off
rem Starts the API (port 8000) and the web app (port 5173) in two windows.
cd /d "%~dp0"
start "AstroBinesh API" cmd /k python -m uvicorn backend.main:app --port 8000
start "AstroBinesh Web" cmd /k npm --prefix frontend run dev
echo Open http://localhost:5173
