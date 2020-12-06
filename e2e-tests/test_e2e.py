import pytest


@pytest.mark.e2e
def test_notebook_tree(page, base_url):
    # Go to http://localhost:8888/tree
    page.goto(base_url + "/tree")

    # Click text="Conda"
    with page.expect_popup() as popup_info:
        page.click('text="Conda"')
    page1 = popup_info.value

    # text="Conda environments" should be present
    page1.waitForSelector('text="Conda environments"')


@pytest.mark.e2e
def test_notebook_main(page, base_url):
    # Go to http://localhost:8888/tree
    page.goto(base_url + "/tree")

    # Click text="New"
    page.click('text="New"')

    # Click a[aria-label="python3"]
    with page.expect_popup() as popup_info:
        page.click('a[aria-label="python3"]')
    page1 = popup_info.value

    # Click text="Kernel"
    page1.click('a[id="kernellink"]')

    # Click text="Conda Packages"
    with page1.expect_popup() as popup_info:
        page1.click('a[id="conda_tab"]')

    page2 = popup_info.value
    page2.waitForSelector('text="Conda environments"')
