import asyncio
import datetime
import logging
import re
from unittest.mock import patch

import pytest
import tornado
from mamba_gator.handlers import NS

TIMEOUT = 150
SLEEP = 1


@pytest.fixture
def wait_task(jp_fetch):
    async def foo(endpoint: str):
        start_time = datetime.datetime.now()

        while (datetime.datetime.now() - start_time).total_seconds() < TIMEOUT:
            await asyncio.sleep(SLEEP)
            response = await jp_fetch(endpoint.lstrip("/"), method="GET")
            if not (200 <= response.code < 300):
                raise tornado.web.HTTPError(response.code, str(response))
            elif response.code != 202:
                return response

        raise RuntimeError("Request {} timed out.".format(endpoint))

    return foo


@pytest.fixture
def wait_for_task(wait_task, jp_fetch):
    async def foo(*args, **kwargs):
        r = await jp_fetch(*args, **kwargs)
        assert r.code == 202
        location = r.headers["Location"]
        assert re.match(r"^/conda/tasks/\d+$", location) is not None
        return await wait_task(location)

    return foo
