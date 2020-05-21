data = [
    {
        "id": "xtensor",
        "version": "0.21.5",
    },
    {
        "id": "libgcc-ng",
        "version": ">=7.3.0",
        "parentIds": ["xtensor", "xtl"]
    },
    {
        "id": "_libgcc_mutex",
        "version": "0.1",
        "parentIds": ["libgcc-ng", "libgomp"]
    },
    {
        "id": "_openmp_mutex",
        "version": ">=4.5",
        "parentIds": ["libgcc-ng"]
    },
    {
        "id": "libgomp",
        "version": ">=7.3.0",
        "parentIds": ["_openmp_mutex"]
    },
    {
        "id": "libstdcxx-ng",
        "version": ">=7.3.0",
        "parentIds": ["xtensor", "xtl"]
    },
    {
        "id": "xtl",
        "parentIds": ["xtensor"]
    },
]
