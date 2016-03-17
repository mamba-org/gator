"${PREFIX}/bin/jupyter" nbextension install --py="${PKG_NAME}" --overwrite --sys-prefix
"${PREFIX}/bin/jupyter" nbextension enable --py="${PKG_NAME}" --sys-prefix
"${PREFIX}/bin/jupyter" serverextension enable --py="${PKG_NAME}" --sys-prefix
