from pathlib import Path

import pytest
from packaging.version import Version, InvalidVersion

from mamba_gator.envmanager import EnvManager, parse_version, normalize_preview_pkg

from .utils import has_mamba


def test_envmanager_manager():
    manager = EnvManager("", None)
    expected = "mamba" if has_mamba else "conda"
    assert Path(manager.manager).stem == expected


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
    """Test that year versions with 'z' suffix convert to .26 (z is the 26th letter)."""
    result = parse_version("2023z")
    assert result == Version("2023.26")


def test_parse_standard_semantic_version_unchanged():
    """Test that standard semantic versions pass through unchanged."""
    result = parse_version("1.21.0")
    assert result == Version("1.21.0")

@pytest.mark.parametrize("raw,expected_name,expected_version", [
    ({"name": "  numpy ", "version": "1.24.0", "build_string": "py311h", "channel": "conda-forge"}, "numpy", "1.24.0"),
    ({"name": "pandas", "version": 2.0, "build": "hab123", "dist_name": "pandas-2.0", "base_url": "https://conda.anaconda.org/conda-forge"}, "pandas", "2.0"),
    ({}, None, None),
])
def test_normalize_preview_pkg(raw, expected_name, expected_version):
    result = normalize_preview_pkg(raw)
    assert result["name"] == expected_name
    assert result["version"] == expected_version
    assert "dist_name" in result
    assert "base_url" in result

def test_consolidate_empty_data():
    manager = EnvManager("", None)
    assert manager._consolidate_dry_run_json({}) == {"LINK": [], "UNLINK": [], "FETCH": []}

def test_consolidate_error_true():
    manager = EnvManager("", None)
    result = manager._consolidate_dry_run_json({"error": True})
    assert "error" in result

def test_consolidate_with_actions():
    manager = EnvManager("", None)
    data = {
        "actions": {
            "LINK": [{"name": "numpy", "version": "1.24.0", "channel": "conda-forge"}],
            "UNLINK": [{"name": "numpy", "version": "1.23.0", "channel": "conda-forge"}],
            "FETCH": [{"name": "numpy", "version": "1.24.0", "dist_name": "numpy-1.24.0", "base_url": "https://..."}],
        }
    }
    result = manager._consolidate_dry_run_json(data)
    assert len(result["LINK"]) == 1
    assert len(result["UNLINK"]) == 1
    assert len(result["FETCH"]) == 1
    assert result["LINK"][0]["name"] == "numpy"

@pytest.mark.parametrize("packages,link_names,expected_side_effects", [
    # exact match, no side effects
    (["numpy"], ["numpy"], False),
    # dependency pulled in -> side effects
    (["numpy"], ["numpy", "libopenblas"], True),
    # version-pinned with ==
    (["numpy==1.24"], ["numpy"], False),
    # >=  operator
    (["python>=3.10"], ["python"], False),
    # != operator
    (["python!=3.14.0"], ["python"], False),
    # <= operator
    (["python<=3.12"], ["python"], False),
    # channel-qualified spec
    (["conda-forge::numpy>=1.20"], ["numpy"], False),
    # mixed case in request
    (["NumPy"], ["numpy"], False),
    # multiple packages, one extra dep
    (["numpy", "pandas>=2.0"], ["numpy", "pandas", "python-dateutil"], True),
    # single = (conda legacy pinning)
    (["numpy=1.24"], ["numpy"], False),
])
async def test_dry_run_has_side_effects(packages, link_names, expected_side_effects):
    """Verify has_side_effects is computed correctly for various spec formats."""
    from unittest import mock
    from unittest.mock import AsyncMock
    import json

    link_records = [{"name": n, "version": "1.0", "channel": "defaults"} for n in link_names]
    dry_run_output = json.dumps({"actions": {"LINK": link_records, "UNLINK": [], "FETCH": []}})

    manager = EnvManager("", None)
    with mock.patch.object(manager, "_execute", new_callable=AsyncMock) as exe:
        exe.return_value = (0, dry_run_output)
        result = await manager._dry_run_command("base", "install", packages)

    assert result["has_side_effects"] is expected_side_effects


async def test_list_available_returns_valid_structure():
    """Test that list_available returns the expected data structure."""
    manager = EnvManager("", None)
    result = await manager.list_available()
    assert "packages" in result
    assert "with_description" in result


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
            assert versions == sorted(versions, reverse=True)


async def test_list_available_handles_invalid_versions_gracefully():
    """Test that list_available doesn't crash with invalid versions and logs warnings."""
    manager = EnvManager("", None)

    # This should complete without crashing, even if some packages have invalid versions
    result = await manager.list_available()

    # Should still return valid structure
    assert "packages" in result
    assert isinstance(result["packages"], list)


async def test_list_available_preserves_package_metadata():
    """Test that version parsing doesn't break other package metadata."""
    manager = EnvManager("", None)
    result = await manager.list_available()

    if result["packages"]:
        # Check that packages still have their expected metadata
        package = result["packages"][0]
        expected_fields = {"name", "version", "channel"}
        assert all(field in package for field in expected_fields)

        # Version should be a list of strings
        assert isinstance(package["version"], list)
        assert all(isinstance(v, str) for v in package["version"])


async def test_list_available_version_parsing_integration():
    """Test the full integration of version parsing within list_available."""
    manager = EnvManager("", None)
    result = await manager.list_available()

    if result["packages"]:
        # Look for packages that might have had version parsing applied
        for package in result["packages"]:
            if package["version"]:
                # All versions should be valid strings after parsing
                for version_str in package["version"]:
                    assert isinstance(version_str, str)
                    assert len(version_str) > 0

                    # Should be parseable by packaging.Version after our parsing
                    try:
                        Version(version_str)
                    except InvalidVersion:
                        # If this fails, our version parsing didn't work correctly
                        pytest.fail(f"Version '{version_str}' from package '{package['name']}' is not valid after parsing")


async def test_list_available_build_metadata_preserved():
    """Test that build numbers and strings are correctly aligned with parsed versions."""
    manager = EnvManager("", None)
    result = await manager.list_available()

    if result["packages"]:
        for package in result["packages"]:
            versions = package.get("version", [])
            build_numbers = package.get("build_number", [])
            build_strings = package.get("build_string", [])

            if versions and build_numbers:
                # All arrays should have the same length
                assert len(versions) == len(build_numbers)

            if versions and build_strings:
                assert len(versions) == len(build_strings)
