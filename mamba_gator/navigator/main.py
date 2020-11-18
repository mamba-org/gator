# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os

from jupyterlab_server import LabConfig, LabServerApp
from notebook.utils import url_path_join as ujoin
from traitlets import Unicode
from tornado import web

from mamba_gator.handlers import load_jupyter_server_extension
from mamba_gator._version import __version__

HERE = os.path.dirname(__file__)


class MambaNavigator(LabServerApp):
    default_url = Unicode("/gator", help="The default URL to redirect to from `/`")

    lab_config = LabConfig(
        app_name="Mamba Navigator",
        app_settings_dir=os.path.join(HERE, "application_settings"),
        app_version=__version__,
        app_url="/gator",
        schemas_dir=os.path.join(HERE, "schemas"),
        static_dir=os.path.join(HERE, "static"),
        templates_dir=os.path.join(HERE, "templates"),
        terminals=False,
        themes_dir=os.path.join(HERE, "themes"),
        user_settings_dir=os.path.join(HERE, "user_settings"),
        workspaces_dir=os.path.join(HERE, "workspaces"),
    )

    def start(self):
        load_jupyter_server_extension(self)
        super().start()


def main():
    # Turn off the Jupyter configuration system so configuration files on disk do
    # not affect this app. This helps this app to truly be standalone.
    os.environ["JUPYTER_NO_CONFIG"] = "1"

    MambaNavigator.launch_instance()
