from pathlib import Path

import pytest
from slugify import slugify


def take_screenshot(page, uid):
    screenshot_dir = Path(".playwright") / "screenshots"
    screenshot_dir.mkdir(exist_ok=True)
    page.screenshot(path=str(screenshot_dir / f"{uid}.png"))


def pytest_runtest_makereport(item, call) -> None:
    if call.when == "call":
        if call.excinfo is not None:
            if "page" in item.funcargs:
                take_screenshot(item.funcargs["page"], slugify(item.nodeid))
            if "context" in item.funcargs:
                for idx, page in enumerate(item.funcargs["context"].pages):
                    take_screenshot(page, "-".join((slugify(item.nodeid), str(idx))))
            if "capturing_context" in item.funcargs:
                for idx, page in enumerate(item.funcargs["capturing_context"].pages):
                    take_screenshot(page, "-".join((slugify(item.nodeid), str(idx))))
            if "browser" in item.funcargs:
                for cidx, context in enumerate(item.funcargs["browser"].contexts):
                    for idx, page in enumerate(context.pages):
                        take_screenshot(
                            page, "-".join((slugify(item.nodeid), str(cidx), str(idx)))
                        )


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "recordVideo": {"dir": str(Path(".playwright") / "videos/")},
    }
