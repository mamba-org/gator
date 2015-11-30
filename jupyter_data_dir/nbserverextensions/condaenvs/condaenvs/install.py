#!/usr/bin/env python
# coding: utf-8

# Copyright (c) - Continuum Analytics

import argparse
import os
from os.path import abspath, dirname, exists, join
from pprint import pprint
try:
    from inspect import signature
except ImportError:
    from funcsigs import signature

from jupyter_core.paths import jupyter_config_dir, ENV_CONFIG_PATH

def install(enable=False, **kwargs):
    """Install the nbextension assets and optionally enables the
       nbextension and server extension for every run.

    Parameters
    ----------
    enable: bool
        Enable the extension on every notebook launch
    **kwargs: keyword arguments
        Other keyword arguments passed to the install_nbextension command
    """
    from notebook.nbextensions import install_nbextension
    from notebook.services.config import ConfigManager

    directory = join(abspath(dirname(__file__)), 'nbextension', 'static')

    kwargs = {k: v for k, v in kwargs.items() if not (v is None)}

    kwargs["destination"] = "condaenvs"
    install_nbextension(directory, **kwargs)

    if enable:
        if "prefix" in kwargs:
            path = join(kwargs["prefix"], "etc", "jupyter")
            if not exists(path):
                print("Making directory", path)
                os.makedirs(path)

        cm = ConfigManager(config_dir=path)
        print("Enabling server component in", cm.config_dir)
        cfg = cm.get("jupyter_notebook_config")
        print("Existing config...")
        pprint(cfg)

        server_extensions = (
            cfg.setdefault("NotebookApp", {})
            .setdefault("server_extensions", [])
        )
        if "condaenvs" not in server_extensions:
            cfg["NotebookApp"]["server_extensions"] += ["condaenvs.nbextension"]

        cm.update("jupyter_notebook_config", cfg)
        print("New config...")
        pprint(cm.get("jupyter_notebook_config"))

        cm = ConfigManager(config_dir=join(ENV_CONFIG_PATH[0], "nbconfig"))
        print(
            "Enabling nbextension at notebook launch in",
            cm.config_dir
        )

        if not exists(cm.config_dir):
            print("Making directory", cm.config_dir)
            os.makedirs(cm.config_dir)

        cm.update(
            "tree", {
                "load_extensions": {
                    'condaenvs/main': True
                },
            }
        )


if __name__ == '__main__':
    from notebook.nbextensions import install_nbextension

    install_kwargs = list(signature(install_nbextension).parameters)

    parser = argparse.ArgumentParser(
        description="Installs nbextension")
    parser.add_argument(
        "-e", "--enable",
        help="Automatically load server and nbextension on notebook launch",
        action="store_true")

    default_kwargs = dict(
        action="store",
        nargs="?"
    )

    store_true_kwargs = dict(action="store_true")

    store_true = ["symlink", "overwrite", "quiet", "user"]

    [parser.add_argument(
        "--{}".format(arg),
        **(store_true_kwargs if arg in store_true else default_kwargs)
        )
        for arg in install_kwargs]

    install(**parser.parse_args().__dict__)
