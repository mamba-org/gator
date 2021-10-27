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

/**
 * Construct the base URL for all endpoints available on the conda-store server.
 *
 * @param {string} serverURL - URL of the conda-store server; usually http://localhost:5000
 * @returns {string} Formatted base URL for all conda-store server endpoints
 */
function getServerUrl(serverURL: string): string {
  return `${serverURL}/api/v1`;
}

/**
 * Get the status of the conda-store server.
 *
 * @async
 * @param {string} baseUrl - Base URL of the conda-store server; usually http://localhost:5000
 * @throws {Error} - Thrown if the request fails or the response is not ok.
 * @return {Promise<{
    status: string
}>} Status of the conda-store server
 */
export async function condaStoreServerStatus(
  baseUrl: string
): Promise<{
  status: string;
}> {
  let response;
  try {
    response = await fetch(`${getServerUrl(baseUrl)}`);
  } catch {
    throw new Error(
      `Failed to reach the conda-store server at ${getServerUrl(baseUrl)}`
    );
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
  const response = await fetch(
    `${getServerUrl(baseUrl)}/environment/?page=${page}&size=${size}`
  );
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
  const response = await fetch(
    `${getServerUrl(baseUrl)}/package/?search=${term}`
  );
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
  const response = await fetch(
    `${getServerUrl(
      baseUrl
    )}/package/?page=${page}&size=${size}&distinct_on=name&distinct_on=version&sort_by=name`
  );
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

  let response = await fetch(
    `${getServerUrl(baseUrl)}/environment/${namespace}/${environment}/`
  );

  if (response.ok) {
    const { data } = await response.json();
    response = await fetch(
      `${getServerUrl(baseUrl)}/build/${
        data.current_build_id
      }/packages/?page=${page}&size=${size}&sort_by=name`
    );
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
  const response = await fetch(`${getServerUrl(baseUrl)}/build/${build_id}/`);
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
  const response = await fetch(`${getServerUrl(baseUrl)}/channel/`);
  if (response.ok) {
    return await response.json();
  }
  return [];
}
