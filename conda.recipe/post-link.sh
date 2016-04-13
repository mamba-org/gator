"${PREFIX}/bin/jupyter" nbextension install --overwrite --sys-prefix --py "${PKG_NAME}"
"${PREFIX}/bin/jupyter" nbextension enable --sys-prefix --py "${PKG_NAME}"
"${PREFIX}/bin/jupyter" serverextension enable --sys-prefix --py "${PKG_NAME}"
