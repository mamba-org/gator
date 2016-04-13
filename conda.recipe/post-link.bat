"%PREFIX%\Scripts\jupyter" nbextension install --overwrite --sys-prefix --py "%PKG_NAME%"
"%PREFIX%\Scripts\jupyter" nbextension enable --sys-prefix --py "%PKG_NAME%"
"%PREFIX%\Scripts\jupyter" serverextension enable --sys-prefix --py "%PKG_NAME%"
errorlevel 1 exit 1
