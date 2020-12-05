#!/bin/bash
set -e

apt-get update
apt install -y python3-distutils
python3 ./e2e-tests/get-pip.py
python3 -m pip install playwright pytest-asyncio pytest-playwright jupyter_server pytest_tornasync
python3 -m playwright install
python3 -m pytest -m e2e mamba_gator/tests/test_e2e.py --base-url http://notebook:8888
