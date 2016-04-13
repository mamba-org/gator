"${PREFIX}/bin/jupyter" nbextension disable --sys-prefix --py "${PKG_NAME}"
"${PREFIX}/bin/jupyter" nbextension uninstall --sys-prefix --py "${PKG_NAME}"
"${PREFIX}/bin/jupyter" serverextension disable --sys-prefix --py "${PKG_NAME}"
