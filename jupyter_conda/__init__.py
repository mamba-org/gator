# flake8: noqa

import json
import os.path as osp

from ._version import version_info, __version__
from .handlers import load_jupyter_server_extension

HERE = osp.abspath(osp.dirname(__file__))

with open(osp.join(HERE, 'labextension', 'package.json')) as fid:
    data = json.load(fid)


# Jupyter Extension points
def _jupyter_labextension_paths():
    return [{
        'src': 'labextension',
        'dest': data['name']
    }]


def _jupyter_nbextension_paths():
    return [
        dict(
            section="notebook", src="nbextension", dest="jupyter_conda", require="jupyter_conda/main"
        ),
        dict(section="tree", src="nbextension", dest="jupyter_conda", require="jupyter_conda/tree"),
    ]


def _jupyter_server_extension_paths():
    return [dict(module="jupyter_conda")]
