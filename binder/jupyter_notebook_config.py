import sys

c.ServerProxy.servers = {
    "mamba": {
        "command": [
            sys.executable,
            "app/main.py",
            "--no-browser",
            '--port={port}',
            "--ip=0.0.0.0",
            "--NotebookApp.token=''",
            "--NotebookApp.base_url={base_url}mamba",
            "--NotebookApp.allow_remote_access=True",
        ],
        "timeout": 120,
        "absolute_url": True,
        "launcher_entry": {
            "enabled": True,
            "icon_path": "/home/jovyan/app/style/mamba.svg",
            "title": "Mamba Navigator",
        },
    },
}
