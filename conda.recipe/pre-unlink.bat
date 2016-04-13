"%PREFIX%\Scripts\jupyter" nbextension disable --sys-prefix --py "%PKG_NAME%"
"%PREFIX%\Scripts\jupyter" nbextension uninstall --sys-prefix  --py "%PKG_NAME%"
"%PREFIX%\Scripts\jupyter" serverextension disable --sys-prefix --py "%PKG_NAME%"
errorlevel 1 exit 1
