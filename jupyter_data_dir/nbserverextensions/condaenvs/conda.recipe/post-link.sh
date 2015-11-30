# enable conda_env extension adding a line to a pre-existing config file or
# creating a new one.
if [ -e $PREFIX/etc/jupyter/jupyter_notebook_config.py ]; then
    config=$(cat $PREFIX/etc/jupyter/jupyter_notebook_config.py)
    if [[ "$config" == *"condaenvs.nbextension"* ]]; then
        echo "The condaenvs extension is already detected/enabled in your jupyter_notebook_config.py file."
    else
        echo "The condaenvs extension was enabled in your jupyter_notebook_config.py file."
        echo "c.NotebookApp.server_extensions.append('condaenvs.nbextension')" >> $PREFIX/etc/jupyter/jupyter_notebook_config.py
    fi
else
    echo "We did not detect a jupyter_notebook_config.py file, we created a new one and enable the condaenvs extension."
    cp -f $PREFIX/etc/jupyter/conda_env_config.py $PREFIX/etc/jupyter/jupyter_notebook_config.py
fi
