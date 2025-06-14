from pathlib import Path

import pytest
from packaging.version import Version

from mamba_gator.envmanager import EnvManager, parse_version

from .utils import has_mamba


@pytest.mark.skipif(has_mamba, reason="Mamba found")
def test_envmanager_manager_conda():
    manager = EnvManager("", None)
    assert Path(manager.manager).stem == "conda"


@pytest.mark.skipif(not has_mamba, reason="Mamba NOT found")
def test_envmanager_manager_mamba():
    manager = EnvManager("", None)
    assert Path(manager.manager).stem == "mamba"


def test_parse_r_style_version_with_underscore():
    """Test that R-style versions with underscores are converted to dots."""
    result = parse_version("1.8_4")
    assert result == Version("1.8.4")


def test_parse_year_based_version_with_letter():
    """Test that year-based versions like '2023d' are converted correctly."""
    result = parse_version("2023d")
    assert result == Version("2023.4")


def test_parse_invalid_version_returns_none():
    """Test that invalid versions return None instead of raising exceptions."""
    result = parse_version("invalid.version.format!")
    assert result is None


def test_parse_version_with_multiple_underscores():
    """Test that versions with multiple underscores are handled correctly."""
    result = parse_version("1.2_3_4")
    assert result == Version("1.2.3.4")


def test_parse_year_version_with_z_suffix():
    """Test that year versions with 'z' suffix convert to .26."""
    result = parse_version("2023z")
    assert result == Version("2023.26")


def test_parse_standard_semantic_version_unchanged():
    """Test that standard semantic versions pass through unchanged."""
    result = parse_version("1.21.0")
    assert result == Version("1.21.0")


@pytest.mark.asyncio
async def test_list_available_returns_valid_structure():
    """Test that list_available returns the expected data structure."""
    manager = EnvManager("", None)
    result = await manager.list_available()
    assert "packages" in result
    assert "with_description" in result


@pytest.mark.asyncio
async def test_list_available_version_sorting_works():
    """Test that version sorting works correctly after parsing in list_available."""
    manager = EnvManager("", None)
    result = await manager.list_available()

    if result["packages"]:
        # Find a package with multiple versions to test sorting
        multi_version_pkg = None
        for pkg in result["packages"]:
            if isinstance(pkg.get("version"), list) and len(pkg["version"]) > 1:
                multi_version_pkg = pkg
                break

        if multi_version_pkg:
            # Check that versions are in ascending order
            versions = [Version(v) for v in multi_version_pkg["version"]]
            assert versions == sorted(versions)
