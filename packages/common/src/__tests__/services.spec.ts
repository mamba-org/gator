import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { Settings } from '@jupyterlab/settingregistry';
import { testEmission } from '@jupyterlab/testutils';
import 'jest';
import { platform } from 'os';
import { CondaEnvironments, CondaPackage } from '../services';

jest.mock('@jupyterlab/services', () => {
  return {
    __esModule: true,
    ServerConnection: {
      makeRequest: jest.fn(),
      makeSettings: jest.fn().mockReturnValue({
        baseUrl: 'foo/'
      })
    }
  };
});
jest.mock('@jupyterlab/settingregistry');

const itSkipIf = (condition: boolean) => (condition ? it.skip : it);

describe('@mamba-org/gator-lab/services', () => {
  const settings = { baseUrl: 'foo/' };

  beforeEach(() => {
    (ServerConnection.makeSettings as jest.Mock).mockReturnValue(settings);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('server request', () => {
    it('should send a redirection location for long running task', async () => {
      // Given
      const name = 'dummy';
      const redirectURL = URLExt.join('conda', 'tasks', '25');

      (ServerConnection.makeRequest as jest.Mock)
        .mockResolvedValue(
          new Response('', { status: 200 }) // Default answer
        )
        .mockResolvedValueOnce(
          // First answer
          new Response('', { headers: { Location: redirectURL }, status: 202 })
        );

      const envManager = new CondaEnvironments();

      await envManager.create(name);

      expect(ServerConnection.makeRequest).toBeCalledWith(
        URLExt.join(settings.baseUrl, 'conda', 'environments'),
        {
          body: JSON.stringify({ name, packages: [''] }),
          method: 'POST'
        },
        settings
      );
      expect(ServerConnection.makeRequest).toHaveBeenLastCalledWith(
        URLExt.join(settings.baseUrl, redirectURL),
        {
          method: 'GET'
        },
        settings
      );
    });

    itSkipIf(platform() === 'win32')(
      'should cancel a redirection location for long running task',
      async () => {
        // Given
        const name = 'dummy';
        let taskIdx = 21;
        const redirectURL = URLExt.join(
          'conda',
          'tasks',
          (taskIdx + 1).toString()
        );

        (ServerConnection.makeRequest as jest.Mock).mockImplementation(
          (
            url: string,
            request: RequestInit,
            settings: ServerConnection.ISettings
          ) => {
            if (url.indexOf('/tasks') < 0) {
              taskIdx += 1;
              return Promise.resolve(
                new Response('', {
                  headers: {
                    Location: URLExt.join('conda', 'tasks', taskIdx.toString())
                  },
                  status: 202
                })
              );
            } else if (Number.parseInt(url.slice(url.length - 2)) !== 22) {
              return Promise.resolve(
                new Response(JSON.stringify({ packages: [] }))
              );
            }

            // let resolve: (value: Response) => void;
            let reject: (reason?: any) => void;

            const promise = new Promise<Response>(
              (resolveFromPromise, rejectFromPromise) => {
                // resolve = resolveFromPromise;
                reject = rejectFromPromise;
              }
            );

            setTimeout(
              () => {
                reject('Fail to cancel promise');
              },
              5000 // Wait maximum for 5 sec
            );

            return promise;
          }
        );

        // when
        const pkgManager = new CondaPackage(name);
        pkgManager.refresh(false, name).catch(err => {
          expect(err.message).toEqual('cancelled');
        });
        try {
          await pkgManager.refresh(false, name);
        } catch (error) {
          console.debug(error);
        }

        // Then
        expect(ServerConnection.makeRequest).toHaveBeenNthCalledWith(
          2,
          URLExt.join(settings.baseUrl, 'conda', 'environments', name),
          {
            method: 'GET'
          },
          settings
        );
        expect(ServerConnection.makeRequest).toHaveBeenCalledWith(
          URLExt.join(settings.baseUrl, redirectURL),
          {
            method: 'DELETE'
          },
          settings
        );
      }
    );
  });

  describe('CondaEnvironments', () => {
    describe('clone()', () => {
      it('should clone an environment', async () => {
        const name = 'twin';
        const source = 'existing';

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source,
              type: 'clone'
            });
          }
        });

        await envManager.clone(source, name);
        await testSignal;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments'),
          {
            body: JSON.stringify({ name, twin: source }),
            method: 'POST'
          },
          settings
        );
      });
    });

    describe('create()', () => {
      it('should create an empty environment', async () => {
        const name = 'dummy';
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source: [''],
              type: 'create'
            });
          }
        });
        await envManager.create(name);
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments'),
          {
            body: JSON.stringify({ name, packages: [''] }),
            method: 'POST'
          },
          settings
        );
      });

      it('should create an environment with the provided packages', async () => {
        const name = 'dummy';
        const pkgs = ['python', 'scipy'];
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source: pkgs,
              type: 'create'
            });
          }
        });

        await envManager.create(name, pkgs.join(' '));
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments'),
          {
            body: JSON.stringify({ name, packages: pkgs }),
            method: 'POST'
          },
          settings
        );
      });
    });

    // TODO describe("dispose()", () => {});

    describe('export()', () => {
      it('should request to export in full format', async () => {
        const name = 'dummy';
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const envManager = new CondaEnvironments();
        await envManager.export(name);

        const queryArgs = URLExt.objectToQueryString({
          download: 1,
          history: 0
        });
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments', name) +
            queryArgs,
          {
            method: 'GET'
          },
          settings
        );
      });

      it('should request to export in history format', async () => {
        const name = 'dummy';
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const envManager = new CondaEnvironments();
        await envManager.export(name, true);

        const queryArgs = URLExt.objectToQueryString({
          download: 1,
          history: 1
        });
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments', name) +
            queryArgs,
          {
            method: 'GET'
          },
          settings
        );
      });
    });

    // TODO describe("getChannels()", () => {});

    // TODO describe("getEnvironmentFromType()", () => {});

    describe('getPackageManager()', () => {
      it('should create a CondaPackage object', () => {
        // Mock API request
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );
        const name = 'base';

        const envManager = new CondaEnvironments();
        const pkgManager = envManager.getPackageManager(name);

        expect(pkgManager).toBeInstanceOf(CondaPackage);
        expect(pkgManager.environment).toBe(name);
      });
    });

    describe('import()', () => {
      it('should import an environment from a file', async () => {
        const name = 'importedFromX';
        const source = 'theFileContent';
        const filename = 'environment.yml';

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source,
              type: 'import'
            });
          }
        });

        await envManager.import(name, source, filename);
        await testSignal;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments'),
          {
            body: JSON.stringify({ name, file: source, filename }),
            method: 'POST'
          },
          settings
        );
      });
    });

    describe('refresh()', () => {
      it('should request the list of environment', async () => {
        const dummyEnvs = ['a', 'b'];
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response(JSON.stringify({ environments: dummyEnvs }), {
            status: 200
          })
        );

        const envManager = new CondaEnvironments();

        const envs = await envManager.refresh();

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments') +
            URLExt.objectToQueryString({ whitelist: 0 }),
          {
            method: 'GET'
          },
          settings
        );

        expect(envs).toEqual(dummyEnvs);
      });

      it('should request the whitelisted environments', async () => {
        const dummyEnvs = ['a', 'b'];
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response(JSON.stringify({ environments: dummyEnvs }), {
            status: 200
          })
        );

        (Settings as jest.Mock).mockImplementation(() => {
          return {
            get: jest.fn().mockImplementation((key: string) => {
              // @ts-ignore
              return {
                fromHistory: { composite: false },
                types: { composite: {} },
                whitelist: { composite: true }
              }[key];
            }),
            changed: {
              connect: jest.fn()
            }
          };
        });

        // @ts-ignore
        const envManager = new CondaEnvironments(new Settings());

        const envs = await envManager.refresh();

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments') +
            URLExt.objectToQueryString({ whitelist: 1 }),
          {
            method: 'GET'
          },
          settings
        );

        expect(envs).toEqual(dummyEnvs);
      });
    });

    describe('remove()', () => {
      it('should request an environment deletion', async () => {
        const name = 'toDelete';

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source: null,
              type: 'remove'
            });
          }
        });

        await envManager.remove(name);
        await testSignal;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments', name),
          {
            method: 'DELETE'
          },
          settings
        );
      });
    });

    describe('update()', () => {
      it('should update an environment from a file', async () => {
        const name = 'updatedFromX';
        const source = 'theFileContent';
        const filename = 'environment.yml';

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source,
              type: 'update'
            });
          }
        });

        await envManager.update(name, source, filename);
        await testSignal;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments', name),
          {
            body: JSON.stringify({ file: source, filename }),
            method: 'PATCH'
          },
          settings
        );
      });
    });

    describe('environments', () => {
      it('should request a refresh and return the environments', async () => {
        const dummyEnvs = ['a', 'b'];
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response(JSON.stringify({ environments: dummyEnvs }), {
            status: 200
          })
        );

        const envManager = new CondaEnvironments();

        const envs = await envManager.environments;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments') +
            URLExt.objectToQueryString({ whitelist: 0 }),
          {
            method: 'GET'
          },
          settings
        );
        expect(envs).toEqual(dummyEnvs);
      });
    });
  });

  describe('CondaPackage', () => {
    describe('check_updates()', () => {
      it('should return the list of updatable packages', async () => {
        const env = 'dummy';
        const pkgs = ['alpha', 'beta', 'gamma'];
        const lst_pkgs = pkgs.map(pkg => {
          return {
            name: pkg
          };
        });
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response(
            JSON.stringify({
              updates: lst_pkgs
            }),
            { status: 200 }
          )
        );

        const pkgManager = new CondaPackage(env);

        const updates = await pkgManager.check_updates();
        const queryArgs = URLExt.objectToQueryString({ status: 'has_update' });
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments', env) +
            queryArgs,
          {
            method: 'GET'
          },
          settings
        );
        expect(updates).toEqual(pkgs);
      });

      it('should use the explicitly provided environment', async () => {
        const env = 'dummy';
        const wanted = 'dummier';
        const pkgs = ['alpha', 'beta', 'gamma'];
        const lst_pkgs = pkgs.map(pkg => {
          return {
            name: pkg
          };
        });
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response(
            JSON.stringify({
              updates: lst_pkgs
            }),
            { status: 200 }
          )
        );

        const pkgManager = new CondaPackage(env);

        const updates = await pkgManager.check_updates(wanted);
        const queryArgs = URLExt.objectToQueryString({ status: 'has_update' });
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, 'conda', 'environments', wanted) +
            queryArgs,
          {
            method: 'GET'
          },
          settings
        );
        expect(updates).toEqual(pkgs);
      });
    });

    describe('develop()', () => {
      it('should request an installation in development mode', async () => {
        const env = 'dummy';
        const path = '/dummy/path/to/package';

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const pkgManager = new CondaPackage(env);

        const testSignal = testEmission(pkgManager.packageChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              environment: env,
              packages: [path],
              type: 'develop'
            });
          }
        });

        await pkgManager.develop(path);
        await testSignal;
        const queryArgs = URLExt.objectToQueryString({ develop: 1 });
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(
            settings.baseUrl,
            'conda',
            'environments',
            env,
            'packages'
          ) + queryArgs,
          {
            body: JSON.stringify({ packages: [path] }),
            method: 'POST'
          },
          settings
        );
      });

      it('should prefer the provided environment', async () => {
        const env = 'dummy';
        const wanted = 'dummier';
        const path = '/dummy/path/to/package';

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const pkgManager = new CondaPackage(env);

        const testSignal = testEmission(pkgManager.packageChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              environment: wanted,
              packages: [path],
              type: 'develop'
            });
          }
        });

        await pkgManager.develop(path, wanted);
        await testSignal;
        const queryArgs = URLExt.objectToQueryString({ develop: 1 });
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(
            settings.baseUrl,
            'conda',
            'environments',
            wanted,
            'packages'
          ) + queryArgs,
          {
            body: JSON.stringify({ packages: [path] }),
            method: 'POST'
          },
          settings
        );
      });
    });

    describe('install()', () => {
      it('should request the installation of some packages', async () => {
        const env = 'dummy';
        const pkgs = ['alpha', 'beta', 'gamma'];

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const pkgManager = new CondaPackage(env);

        const testSignal = testEmission(pkgManager.packageChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              environment: env,
              packages: pkgs,
              type: 'install'
            });
          }
        });

        await pkgManager.install(pkgs);
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(
            settings.baseUrl,
            'conda',
            'environments',
            env,
            'packages'
          ),
          {
            body: JSON.stringify({ packages: pkgs }),
            method: 'POST'
          },
          settings
        );
      });

      it('should prefer the provided environment', async () => {
        const env = 'dummy';
        const wanted = 'dummier';
        const pkgs = ['alpha', 'beta', 'gamma'];

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const pkgManager = new CondaPackage(env);

        const testSignal = testEmission(pkgManager.packageChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              environment: wanted,
              packages: pkgs,
              type: 'install'
            });
          }
        });

        await pkgManager.install(pkgs, wanted);
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(
            settings.baseUrl,
            'conda',
            'environments',
            wanted,
            'packages'
          ),
          {
            body: JSON.stringify({ packages: pkgs }),
            method: 'POST'
          },
          settings
        );
      });
    });

    // TODO describe("refresh()", () => {});

    describe('remove()', () => {
      it('should request the removal of some packages', async () => {
        const env = 'dummy';
        const pkgs = ['alpha', 'beta', 'gamma'];

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const pkgManager = new CondaPackage(env);

        const testSignal = testEmission(pkgManager.packageChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              environment: env,
              packages: pkgs,
              type: 'remove'
            });
          }
        });

        await pkgManager.remove(pkgs);
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(
            settings.baseUrl,
            'conda',
            'environments',
            env,
            'packages'
          ),
          {
            body: JSON.stringify({ packages: pkgs }),
            method: 'DELETE'
          },
          settings
        );
      });

      it('should prefer the provided environment', async () => {
        const env = 'dummy';
        const wanted = 'dummier';
        const pkgs = ['alpha', 'beta', 'gamma'];

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const pkgManager = new CondaPackage(env);

        const testSignal = testEmission(pkgManager.packageChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              environment: wanted,
              packages: pkgs,
              type: 'remove'
            });
          }
        });

        await pkgManager.remove(pkgs, wanted);
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(
            settings.baseUrl,
            'conda',
            'environments',
            wanted,
            'packages'
          ),
          {
            body: JSON.stringify({ packages: pkgs }),
            method: 'DELETE'
          },
          settings
        );
      });
    });

    describe('update()', () => {
      it('should request the update for some packages', async () => {
        const env = 'dummy';
        const pkgs = ['alpha', 'beta', 'gamma'];

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const pkgManager = new CondaPackage(env);

        const testSignal = testEmission(pkgManager.packageChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              environment: env,
              packages: pkgs,
              type: 'update'
            });
          }
        });

        await pkgManager.update(pkgs);
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(
            settings.baseUrl,
            'conda',
            'environments',
            env,
            'packages'
          ),
          {
            body: JSON.stringify({ packages: pkgs }),
            method: 'PATCH'
          },
          settings
        );
      });

      it('should prefer the provided environment', async () => {
        const env = 'dummy';
        const wanted = 'dummier';
        const pkgs = ['alpha', 'beta', 'gamma'];

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response('', { status: 200 })
        );

        const pkgManager = new CondaPackage(env);

        const testSignal = testEmission(pkgManager.packageChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              environment: wanted,
              packages: pkgs,
              type: 'update'
            });
          }
        });

        await pkgManager.update(pkgs, wanted);
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(
            settings.baseUrl,
            'conda',
            'environments',
            wanted,
            'packages'
          ),
          {
            body: JSON.stringify({ packages: pkgs }),
            method: 'PATCH'
          },
          settings
        );
      });
    });

    // TOD describe("refreshAvailablePackages()", () => {})

    // TODO describe("hasDescription()", () => {})
  });
});
