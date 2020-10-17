# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os

from jupyterlab_server import LabConfig, LabServerApp
from notebook.utils import url_path_join as ujoin
from traitlets import Unicode

from jupyter_conda.handlers import load_jupyter_server_extension

HERE = os.path.dirname(__file__)

# Turn off the Jupyter configuration system so configuration files on disk do
# not affect this app. This helps this app to truly be standalone.
os.environ["JUPYTER_NO_CONFIG"] = "1"

with open(os.path.join(HERE, "package.json")) as fid:
    version = json.load(fid)["version"]


class MambaNavigator(LabServerApp):
    default_url = Unicode("/navigator", help="The default URL to redirect to from `/`")

    lab_config = LabConfig(
        app_name="Mamba Navigator",
        app_settings_dir=os.path.join(HERE, "build", "application_settings"),
        app_version=version,
        app_url="/navigator",
        schemas_dir=os.path.join(HERE, "build", "schemas"),
        static_dir=os.path.join(HERE, "build"),
        templates_dir=os.path.join(HERE, "templates"),
        themes_dir=os.path.join(HERE, "build", "themes"),
        user_settings_dir=os.path.join(HERE, "build", "user_settings"),
        workspaces_dir=os.path.join(HERE, "build", "workspaces"),
    )

    def start(self):
        load_jupyter_server_extension(self)
        super().start()


if __name__ == "__main__":
    MambaNavigator.launch_instance()
