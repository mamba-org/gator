"${PREFIX}/bin/jupyter" nbextension disable --py="${PKG_NAME}"  --sys-prefix
"${PREFIX}/bin/jupyter" nbextension uninstall --py="${PKG_NAME}" --sys-prefix
"${PREFIX}/bin/jupyter" serverextension disable --py="${PKG_NAME}" --sys-prefix
