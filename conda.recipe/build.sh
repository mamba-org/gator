#!/bin/bash
$PYTHON setup.py install
"${PREFIX}/bin/jupyter" nbextension install --overwrite --sys-prefix --py "${PKG_NAME}"
