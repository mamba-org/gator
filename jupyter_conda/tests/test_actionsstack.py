from unittest import TestCase
import time

import tornado
from tornado.testing import AsyncTestCase, gen_test

from jupyter_conda.handlers import ActionsStack


class TestActionsStack(AsyncTestCase):
    @gen_test
    def test_put_get(self):
        a = ActionsStack()

        @tornado.gen.coroutine
        def dummy_action():
            return True

        i = a.put(dummy_action)
        self.assertIsInstance(i, int)
        self.assertIsNone(a.get(i))

        yield tornado.gen.moment  # Wait for task completion
        r = a.get(i)
        self.assertTrue(r)

    @gen_test
    def test_put_result(self):
        a = ActionsStack()

        @tornado.gen.coroutine
        def f(i):
            yield tornado.gen.moment
            return i

        to_be_tested = [10, 20, 30]
        idxs = []

        for b in to_be_tested:
            idxs.append(a.put(f, b))

        self.assertEqual(len(idxs), len(to_be_tested))
        for l in idxs:
            self.assertIsInstance(l, int)
            self.assertIsNone(a.get(l))

        for i, v in enumerate(to_be_tested):
            r = None
            while r is None:
                yield tornado.gen.moment
                r = a.get(idxs[i])
            for l in idxs[i + 1 :]:
                self.assertIsNone(a.get(l))
            self.assertEqual(r, v)
