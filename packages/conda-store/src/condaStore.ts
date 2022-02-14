/**
 * @file Client-side functions to call the conda-store REST API.
 *
 * Note: fetch is assumed to be global (execution environment: web browser).
 */

import { parse, stringify } from 'yaml';
import { URLExt } from '@jupyterlab/coreutils';

export interface ICondaStoreEnvironment {
  name: string;
  build_id: number;
  id: number;
  namespace: {
    id: number;
    name: string;
  };
}

export interface ICondaStorePackage {
  name: string;
  version: string;
  channel_id: number;
  id: number;
  license: string;
  sha256: string;
  build: string;
  summary: string;
}

export interface ICondaStoreChannel {
  id: number;
  last_update: string;
  name: string;
}

interface IPaginatedResult<T> {
  count?: number;
  data?: Array<T>;
  page?: number;
  size?: number;
  status?: string;
}

// See class CondaSpecification in conda_store_server/schema.py.
// https://github.com/Quansight/conda-store/blob/main/conda-store-server/conda_store_server/schema.py#L111
interface ICondaStoreSpecification {
  name: string;
  dependencies: Array<string>;
  channels?: Array<string>;
  prefix?: string;
}

/**
 * Construct the base URL for all endpoints available on the conda-store server.
 *
 * @param {string} serverURL - URL of the conda-store server; usually
 * 'http://localhost:5000'
 * @param {string} restEndpoint - Pathname plus query string without the
 * api/version prefix. Example: '/environment/?page=1&size=100'
 * @returns {string} Formatted base URL for all conda-store server endpoints.
 * Examples:
 * - URLExt.join('http://localhost:5000', '/') =>
 *   'http://localhost:5000/api/v1/'
 * - URLExt.join('http://localhost:5000', 'package/?search=python') =>
 *   'http://localhost:5000/api/v1/package/?search=python'
 */
function createApiUrl(serverURL: string, restEndpoint: string): string {
  return URLExt.join(serverURL, 'api', 'v1', restEndpoint);
}

/**
 * Get the status of the conda-store server.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @throws {Error} - Thrown if the request fails or the response is not ok.
 * @return {Promise<{status: string}>} Status of the conda-store server
 */
export async function condaStoreServerStatus(baseUrl: string): Promise<{
  status: string;
}> {
  let response;
  const url = createApiUrl(baseUrl, '/');
  try {
    response = await fetch(url);
  } catch {
    throw new Error(`Failed to reach the conda-store server at ${url}`);
  }
  if (response.ok) {
    return await response.json();
  } else {
    throw new Error(
      `Unexpected response from the conda-store server: ${response}`
    );
  }
}

/**
 * Fetch all conda-store environments.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @return {Promise<IPaginatedResult<ICondaStoreEnvironment>>} All environments visible to conda-store.
 */
export async function fetchEnvironments(
  baseUrl: string,
  page = 1,
  size = 100
): Promise<IPaginatedResult<ICondaStoreEnvironment>> {
  const url = createApiUrl(baseUrl, `/environment/?page=${page}&size=${size}`);
  const response = await fetch(url);
  if (response.ok) {
    return await response.json();
  } else {
    return {};
  }
}

/**
 * Search all packages (both installed and not installed) for a package.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @param {string} term - Search term; both name and descriptions are searched
 * @return {Promise<Array<ICondaStorePackage>>} Packages matching the search term.
 */
export async function searchPackages(
  baseUrl: string,
  term: string
): Promise<Array<ICondaStorePackage>> {
  const url = createApiUrl(baseUrl, `/package/?search=${term}`);
  const response = await fetch(url);
  if (response.ok) {
    return await response.json();
  } else {
    return [];
  }
}

/**
 * Fetch the packages available in the conda-store database.
 *
 * Results are distinct on name and version.
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @return {Promise<IPaginatedResult<ICondaStorePackage>>} List of available packages
 */
export async function fetchPackages(
  baseUrl: string,
  page = 1,
  size = 100
): Promise<IPaginatedResult<ICondaStorePackage>> {
  const url = createApiUrl(
    baseUrl,
    `/package/?page=${page}&size=${size}&distinct_on=name&distinct_on=version&sort_by=name`
  );
  const response = await fetch(url);
  if (response.ok) {
    return await response.json();
  } else {
    return {};
  }
}

/**
 * List the installed packages for the given environment and namespace.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @param {string} namespace - Name of the namespace to be searched
 * @param {string} environment - Name of the environment to be searched
 * @return {Promise<IPaginatedResult<ICondaStorePackage>>} List of packages in the given namespace/environment
 * combination
 */
export async function fetchEnvironmentPackages(
  baseUrl: string,
  namespace: string,
  environment: string,
  page = 1,
  size = 100
): Promise<IPaginatedResult<ICondaStorePackage>> {
  if (namespace === undefined || environment === undefined) {
    console.error(
      `Error: invalid arguments to fetchEnvironmentPackages: envNamespace ${namespace} envName ${environment}`
    );
    return {};
  }

  const environmentInfoUrl = createApiUrl(
    baseUrl,
    `/environment/${namespace}/${environment}/`
  );
  const environmentInfoResponse = await fetch(environmentInfoUrl);

  if (environmentInfoResponse.ok) {
    const { data } = await environmentInfoResponse.json();
    const url = createApiUrl(
      baseUrl,
      `/build/${data.current_build_id}/packages/?page=${page}&size=${size}&sort_by=name`
    );
    const response = await fetch(url);
    if (response.ok) {
      return response.json();
    }
  }
  return {};
}

/**
 * List the packages for the given build.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @param {number} build_id - Build for which the packages are to be listed
 * @return {Promise<IPaginatedResult<ICondaStorePackage>>} List of packages that are part of the
 * given build
 */
export async function fetchBuildPackages(
  baseUrl: string,
  build_id: number
): Promise<IPaginatedResult<ICondaStorePackage>> {
  const url = createApiUrl(baseUrl, `/build/${build_id}/`);
  const response = await fetch(url);
  if (response.ok) {
    return await response.json();
  }
  return {};
}

/**
 * Fetch the channels. Channels are remote repositories containing conda packages.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @return {Promise<Array<ICondaStoreChannel>>} List of all possible channels from which packages
 * may be downloaded..
 */
export async function fetchChannels(
  baseUrl: string
): Promise<Array<ICondaStoreChannel>> {
  const url = createApiUrl(baseUrl, '/channel/');
  const response = await fetch(url);
  if (response.ok) {
    return await response.json();
  }
  return [];
}

/**
 * Create a new environment from a specification.
 *
 * @async
 * @param {string} namespace - Namespace for the environment
 * @param {string} specification - YAML-formatted specification containing environment name and
 * dependencies
 * @returns {Promise<Response>}
 */
export async function specifyEnvironment(
  baseUrl: string,
  namespace: string,
  specification: string
): Promise<Response> {
  const url = createApiUrl(baseUrl, '/specification/');
  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      namespace: namespace,
      specification
    })
  });
}

/**
 * Create a new environment from a list of package names.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @param {string} namespace - Namespace into which the environment is to be created.
 * @param {string} environment - Name of the new environment.
 * @param {Array<string>} dependencies - List of string package names to be added to the spec.
 * @returns {Promise<void>}
 */
export async function createEnvironment(
  baseUrl: string,
  namespace: string,
  environment: string,
  dependencies: Array<string>
): Promise<void> {
  const specification: ICondaStoreSpecification = {
    name: environment,
    dependencies
  };
  await specifyEnvironment(baseUrl, namespace, stringify(specification));
  return;
}

/**
 * Clone an existing environment.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @param {string} existingNamespace - Namespace of the existing environment.
 * @param {string} existingEnvironment - Name of the existing environment.
 * @param {string} namespace - Namespace into which the clone will be created.
 * @param {string} environment - Name of the new environment, which will be a clone of the existing environment.
 * @param {Array<string>} dependencies - List of string package names to be added to the spec.
 * @returns {Promise<void>}
 */
export async function cloneEnvironment(
  baseUrl: string,
  existingNamespace: string,
  existingEnvironment: string,
  namespace: string,
  environment: string
): Promise<void> {
  // Get specification for existing environment
  const specificationResponse = await exportEnvironment(
    baseUrl,
    existingNamespace,
    existingEnvironment
  );

  // Modify specification so that it uses the provided environment name
  const specificationYaml = await specificationResponse.text();
  const specification: ICondaStoreSpecification = parse(specificationYaml);
  specification.name = environment;

  // Pass specification to the API to create new environment based on the
  // provided existiing environment
  const response = await specifyEnvironment(
    baseUrl,
    namespace,
    stringify(specification)
  );
  if (!response.ok) {
    console.error(await response.json());
    throw new Error('Could not clone environment, see browser console.');
  }
  return;
}

/**
 * Remove an environment.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @param {string} namespace - Namespace the environment belongs to.
 * @param {string} environment - Name of the environment.
 * @returns {Promise<void>}
 */
export async function removeEnvironment(
  baseUrl: string,
  namespace: string,
  environment: string
): Promise<void> {
  const url = createApiUrl(
    baseUrl,
    `/environment/${namespace}/${environment}/`
  );
  await fetch(url, {
    method: 'DELETE'
  });
  return;
}

/**
 * Remove one or more packages from an environment.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @param {string} namespace - Namespace in which the environment resides
 * @param {string} environment - Environment for which packages are to be removed
 * @param {Array<string>} packages - Packages to remove
 * @returns {Promise<void>}
 */
export async function removePackages(
  baseUrl: string,
  namespace: string,
  environment: string,
  packages: Array<string>
): Promise<void> {
  // Fetch all the packages from the current environment
  let page = 1;
  let count, data, size;
  let hasMorePackages = true;
  let installed: Array<ICondaStorePackage> = [];

  while (hasMorePackages) {
    ({ count, data, page, size } = await fetchEnvironmentPackages(
      baseUrl,
      namespace,
      environment,
      page
    ));
    hasMorePackages = page * size < count;
    installed = [...installed, ...data];
  }

  // Reconstruct the specification for the current environment, minus the packages to delete
  const toDelete = new Set(packages);
  const dependencies = installed
    .filter(({ name }) => !toDelete.has(name))
    .map(({ name, version }) => `${name}=${version}`);

  await createEnvironment(baseUrl, namespace, environment, dependencies);
  return;
}

/**
 * Export an environment as a yaml file.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @param {string} namespace - Namespace of the environment to be exported
 * @param {string} environment - Name of the environment
 * @returns {Promise<Response>} Response containing the yaml of the environment specification
 * in the response text
 */
export async function exportEnvironment(
  baseUrl: string,
  namespace: string,
  environment: string
): Promise<Response> {
  // First get the build ID of the requested environment
  const enviornmentInfoUrl = createApiUrl(
    baseUrl,
    `/environment/${namespace}/${environment}/`
  );
  const environmentInfoResponse = await fetch(enviornmentInfoUrl);

  const { data } = await environmentInfoResponse.json();
  const url = createApiUrl(baseUrl, `/build/${data.current_build_id}/yaml/`);
  return await fetch(url);
}
