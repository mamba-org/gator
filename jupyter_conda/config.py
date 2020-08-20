from traitlets import Unicode
from traitlets.config import Configurable


class JupyterConda(Configurable):
    """Configuration for jupyter_conda server extension."""

    kernels_path = Unicode(
        default_value=None,
        allow_none=True,
        help="""Install kernel of the environment in the provided path.

        If this variable is None (default value), the kernel spec won't be installed.
        Note: you need to install ipykernel in each environment for this to work.
        """,
        config=True,
    )

    name_format = Unicode(
        "{0} [conda env:{1}]",
        config=True,
        help="String name format; '{{0}}' = Language, '{{1}}' = Environment name",
    )
