"%PREFIX%\Scripts\jupyter-nbextension" disable nb_conda --py --sys-prefix && "%PREFIX%\Scripts\jupyter-serverextension" disable nb_conda --py --sys-prefix && if errorlevel 1 exit 1
