"%PREFIX%\Scripts\jupyter-nbextension.exe" enable nb_conda --py --sys-prefix && "%PREFIX%\Scripts\jupyter-serverextension.exe" enable --py nb_conda --sys-prefix && if errorlevel 1 exit 1
