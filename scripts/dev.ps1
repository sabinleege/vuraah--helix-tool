# Starts the Helix API (port 8000) and the web dashboard (port 3100) in two windows.
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path "$root\.venv")) { py -m venv "$root\.venv"; & "$root\.venv\Scripts\python" -m pip install -r "$root\requirements.txt" }
if (-not (Test-Path "$root\apps\web\node_modules")) { Push-Location "$root\apps\web"; npm install; Pop-Location }
Start-Process powershell -WorkingDirectory $root -ArgumentList '-NoExit','-Command','$env:PYTHONPATH="services/api"; .\.venv\Scripts\python -m uvicorn app.main:app --port 8000'
Start-Process powershell -WorkingDirectory "$root\apps\web" -ArgumentList '-NoExit','-Command','npx next dev -p 3100'
Start-Sleep 8; Start-Process 'http://localhost:3100'
