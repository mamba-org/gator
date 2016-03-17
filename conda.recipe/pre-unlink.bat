"%PREFIX%\Scripts\jupyter" nbextension disable --py "%PKG_NAME%" --sys-prefix
"%PREFIX%\Scripts\jupyter" nbextension uninstall --py "%PKG_NAME%" --sys-prefix
"%PREFIX%\Scripts\jupyter" serverextension disable --py "%PKG_NAME%" --sys-prefix
errorlevel 1 exit 1
