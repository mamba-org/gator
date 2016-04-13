"%PYTHON%" setup.py install
"%PREFIX%\Scripts\jupyter" nbextension install --overwrite --sys-prefix --py "%PKG_NAME%"
if errorlevel 1 exit 1
