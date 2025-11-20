# API Reference

This section contains the API reference documentation for Gator.

## REST API

Gator provides a REST API for managing conda environments and packages. The API specification is available in the OpenAPI/Swagger format:

- [REST API Specification](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/mamba-org/gator/master/mamba_gator/rest_api.yml)
- [![Swagger Validator](https://img.shields.io/swagger/valid/3.0?specUrl=https%3A%2F%2Fraw.githubusercontent.com%2Fmamba-org%2Fgator%2Fmaster%2Fmamba_gator%2Frest_api.yml)](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/mamba-org/gator/master/mamba_gator/rest_api.yml)

## Python API

```{eval-rst}
.. automodule:: mamba_gator
   :members:
   :undoc-members:
   :show-inheritance:
```

### Environment Manager

```{eval-rst}
.. automodule:: mamba_gator.envmanager
   :members:
   :undoc-members:
   :show-inheritance:
```

### Handlers

```{eval-rst}
.. automodule:: mamba_gator.handlers
   :members:
   :undoc-members:
   :show-inheritance:
```

## TypeScript/JavaScript API

The TypeScript/JavaScript API documentation will be available in a future release.

### JupyterLab Extension

The JupyterLab extension provides the following main interfaces:

- `IEnvironmentManager`: Interface for managing conda environments
- `Conda.IPackageManager`: Interface for managing conda packages

Detailed TypeScript API documentation coming soon.

