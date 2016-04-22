"${PYTHON}" setup.py install
"${PREFIX}/bin/jupyter-nbextension" install nb_conda --py --sys-prefix --overwrite
