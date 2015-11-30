#!/bin/bash

# copy the nbserver extension into site-packages
mkdir -p $PREFIX/lib/python$PY_VER/site-packages/condaenvs
cp -rf condaenvs/* $PREFIX/lib/python$PY_VER/site-packages/condaenvs

mkdir -p $PREFIX/etc/jupyter
cp -rf conda_env_config.py $PREFIX/etc/jupyter/conda_env_config.py
