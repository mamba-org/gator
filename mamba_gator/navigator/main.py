# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import logging
import os

from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.extension.handler import (
    ExtensionHandlerJinjaMixin,
    ExtensionHandlerMixin,
)
from jupyter_server.utils import url_path_join as ujoin
from jupyterlab_server import LabServerApp
from mamba_gator._version import __version__
from mamba_gator.handlers import _load_jupyter_server_extension
from mamba_gator.log import get_logger

HERE = os.path.dirname(__file__)


class MambaNavigatorHandler(
    ExtensionHandlerJinjaMixin, ExtensionHandlerMixin, JupyterHandler
):
    def get(self):
        config_data = {
            "appVersion": __version__,
            "baseUrl": self.base_url,
            "token": self.settings["token"],
            "fullStaticUrl": ujoin(self.base_url, "static", self.name),
            "frontendUrl": ujoin(self.base_url, "gator/"),
        }
        return self.write(
            self.render_template(
                "index.html",
                static=self.static_url,
                base_url=self.base_url,
                token=self.settings["token"],
                page_config=config_data,
            )
        )


class MambaNavigator(LabServerApp):
    name = __name__
    app_name = "Mamba Navigator"
    app_url = "/gator"
    default_url = "/gator"
    extension_url = "/gator"
    app_settings_dir = os.path.join(HERE, "application_settings")
    app_version = __version__
    load_other_extensions = False
    schemas_dir = os.path.join(HERE, "schemas")
    static_dir = os.path.join(HERE, "static")
    templates_dir = os.path.join(HERE, "templates")
    terminals = False
    themes_dir = os.path.join(HERE, "themes")
    user_settings_dir = os.path.join(HERE, "user_settings")
    workspaces_dir = os.path.join(HERE, "workspaces")

    def initialize_handlers(self):
        self.handlers.append(("/gator", MambaNavigatorHandler))
        super().initialize_handlers()

    def start(self):
        _load_jupyter_server_extension(self)
        super().start()


def main():
    MambaNavigator.launch_instance()


if __name__ == "__main__":
    main()
