import asyncio
import functools
import subprocess
import sys
import time

import pytest
from mamba_gator.handlers import ActionsStack


@pytest.mark.asyncio
async def test_ActionsStack_cancel():
    a = ActionsStack()
    dt = 0.01

    async def dummy_action():
        try:
            await asyncio.sleep(100.0 * dt)
        except asyncio.CancelledError:
            raise
        else:
            assert False, "CancelledError not raised"

        return True

    i = a.put(dummy_action)
    assert isinstance(i, int)

    await asyncio.sleep(dt)
    a.cancel(i)

    r = None
    elapsed = 0.0
    with pytest.raises(asyncio.CancelledError):
        while r is None and elapsed < 50 * dt:
            r = a.get(i)
            await asyncio.sleep(dt)  # Wait for task cancellation completion


@pytest.mark.asyncio
async def test_ActionsStack_cancel_subprocess():
    a = ActionsStack()
    dt = 0.01

    async def dummy_action():
        loop = asyncio.get_event_loop()
        code = f"import time; time.sleep(100.0 * {dt})"
        proc = await loop.run_in_executor(
            None,
            functools.partial(
                subprocess.Popen,
                [sys.executable, "-c", code],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            ),
        )
        try:
            r = await loop.run_in_executor(None, proc.communicate)
            return r
        except asyncio.CancelledError:
            proc.terminate()
            await loop.run_in_executor(None, proc.wait)
            raise
        else:
            assert False, "CancelledError not raised"

    i = a.put(dummy_action)
    await asyncio.sleep(3.0 * dt)  # Give time to the processus to start
    a.cancel(i)

    r = None
    elapsed = 0.0
    with pytest.raises(asyncio.CancelledError):
        while r is None and elapsed < 50 * dt:
            r = a.get(i)
            await asyncio.sleep(dt)  # Wait for task cancellation completion


@pytest.mark.asyncio
async def test_ActionsStack_put_get():
    a = ActionsStack()
    dt = 0.01

    async def dummy_action():
        await asyncio.sleep(dt)
        return True

    i = a.put(dummy_action)
    assert isinstance(i, int)
    r = a.get(i)
    assert r is None

    elapsed = 0.0
    while r is None and elapsed < 50 * dt:
        elapsed += dt
        await asyncio.sleep(2 * dt)  # Wait for task completion
        r = a.get(i)
    assert r


@pytest.mark.asyncio
async def test_ActionsStack_put_result():
    a = ActionsStack()

    async def f(i):
        await asyncio.sleep(0.01)
        return i

    to_be_tested = [10, 20, 30]
    idxs = []

    for b in to_be_tested:
        idxs.append(a.put(f, b))

    len(idxs) == len(to_be_tested)
    for l in idxs:
        assert isinstance(l, int)
        assert a.get(l) is None

    for i, v in enumerate(to_be_tested):
        r = None
        elapsed = 0.0
        dt = 0.02
        while r is None and elapsed < 50 * dt:
            elapsed += dt
            await asyncio.sleep(dt)
            r = a.get(idxs[i])
        assert r == v
