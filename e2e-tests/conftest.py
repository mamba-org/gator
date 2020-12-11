from pathlib import Path
from time import sleep

import pytest
from slugify import slugify

SLOW_MOTION_TIME = 2000  # Time to wait between action in milliseconds


def take_screenshot(page, uid):
    screenshot_dir = Path(".playwright") / "screenshots"
    screenshot_dir.mkdir(exist_ok=True)
    page.screenshot(path=str(screenshot_dir / f"{uid}.png"))


def pytest_runtest_makereport(item, call) -> None:
    if call.when == "call":
        if call.excinfo is not None and "browser" in item.funcargs:
            for cidx, context in enumerate(item.funcargs["browser"].contexts):
                for idx, page in enumerate(context.pages):
                    take_screenshot(
                        page, "-".join((slugify(item.nodeid), str(cidx), str(idx)))
                    )


@pytest.fixture(scope="session")
def slow_motion():
    """Sleep for delay seconds.
    By default 0.001 * SLOW_MOTION_TIME
    """

    def pause(delay=SLOW_MOTION_TIME * 0.001):
        sleep(delay)

    return pause


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    return {**browser_type_launch_args, "slowMo": SLOW_MOTION_TIME, "timeout": 5000}


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "recordVideo": {"dir": str(Path(".playwright") / "videos/")},
    }
