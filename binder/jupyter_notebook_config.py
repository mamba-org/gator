import sys

c.ServerProxy.servers = {
    "mamba": {
        "command": [
            sys.executable,
            "-m",
            "mamba_gator",
            "--no-browser",
            '--port={port}',
            "--ip=0.0.0.0",
            "--ServerApp.token=''",
            "--ServerApp.base_url={base_url}mamba",
            "--ServerApp.allow_remote_access=True",
        ],
        "timeout": 120,
        "absolute_url": True,
        "launcher_entry": {
            "enabled": True,
            "icon_path": "/home/jovyan/packages/navigator/style/mamba.svg",
            "title": "Mamba Navigator",
        },
    },
}
