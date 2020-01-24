import asyncio
import time
from unittest import TestCase

import pytest
import tornado
from jupyter_conda.handlers import ActionsStack


@pytest.mark.asyncio
async def test_ActionsStack_put_get():
    a = ActionsStack()
    ActionsStack.start_worker()

    async def dummy_action():
        await asyncio.sleep(0.01)
        return True

    i = a.put(dummy_action)
    assert isinstance(i, int)
    r = a.get(i)
    assert r is None

    while r is None:
        await asyncio.sleep(0.02)  # Wait for task completion
        r = a.get(i)
    assert r


@pytest.mark.asyncio
async def test_ActionsStack_put_result():
    a = ActionsStack()
    ActionsStack.start_worker()

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
        elapsed = 0.
        dt = 0.02
        while r is None and elapsed < 50 * dt:
            elapsed += dt
            await asyncio.sleep(dt)
            r = a.get(idxs[i])
        assert r == v
