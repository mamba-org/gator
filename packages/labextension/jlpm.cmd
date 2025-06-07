@echo off
REM Fake jlpm for Windows that redirects to yarn
REM Prevents JupyterLab's internal jlpm calls from failing in yarn workspaces
REM TODO: Remove during JupyterLab 4 upgrade

yarn %* 