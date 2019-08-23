import "jest";
import { CondaEnvironments, CondaPackage } from "../services";
import { ServerConnection } from "@jupyterlab/services";
import { URLExt } from "@jupyterlab/coreutils";
import { testEmission } from "@jupyterlab/testutils";

jest.mock("@jupyterlab/services");

describe("jupyterlab_conda/services", () => {
  const settings = { baseUrl: "foo/" };

  beforeAll(() => {
    (ServerConnection.makeSettings as jest.Mock).mockReturnValue(settings);
  });

  describe("CondaEnvironments", () => {
    describe("clone()", () => {
      it("should clone an environment", async () => {
        const name = "twin";
        const source = "existing";

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response("", { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source,
              type: "clone"
            });
          }
        });

        await envManager.clone(source, name);
        await testSignal;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, "conda", "environments"),
          {
            body: JSON.stringify({ name, twin: source }),
            method: "POST"
          },
          settings
        );
      });
    });

    describe("create()", () => {
      it("should create an empty environment", async () => {
        const name = "dummy";
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response("", { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source: [""],
              type: "create"
            });
          }
        });
        await envManager.create(name);
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, "conda", "environments"),
          {
            body: JSON.stringify({ name, packages: [""] }),
            method: "POST"
          },
          settings
        );
      });

      it("should create an environment with the provided packages", async () => {
        const name = "dummy";
        const pkgs = ["python", "scipy"];
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response("", { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source: pkgs,
              type: "create"
            });
          }
        });

        await envManager.create(name, pkgs.join(" "));
        await testSignal;
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, "conda", "environments"),
          {
            body: JSON.stringify({ name, packages: pkgs }),
            method: "POST"
          },
          settings
        );
      });
    });

    // TODO describe("dispose()", () => {});

    describe("export()", () => {
      it("should request to export", async () => {
        const name = "dummy";
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response("", { status: 200 })
        );

        const envManager = new CondaEnvironments();
        await envManager.export(name);

        const queryArgs = URLExt.objectToQueryString({ download: 1 });
        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, "conda", "environments", name) +
            queryArgs,
          {
            method: "GET"
          },
          settings
        );
      });
    });

    // TODO describe("getChannels()", () => {});

    // TODO describe("getEnvironmentFromType()", () => {});

    describe("getPackageManager()", () => {
      it("should create a CondaPackage object", () => {
        // Mock API request
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response("", { status: 200 })
        );
        const name = "base";

        const envManager = new CondaEnvironments();
        const pkgManager = envManager.getPackageManager(name);

        expect(pkgManager).toBeInstanceOf(CondaPackage);
        expect(pkgManager.packages).toHaveLength(0);
        expect(pkgManager.environment).toBe(name);
      });
    });

    describe("import()", () => {
      it("should import an environment from a file", async () => {
        const name = "importedFromX";
        const source = "theFileContent";
        const filename = "environment.yml";

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response("", { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source,
              type: "import"
            });
          }
        });

        await envManager.import(name, source, filename);
        await testSignal;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, "conda", "environments"),
          {
            body: JSON.stringify({ name, file: source, filename }),
            method: "POST"
          },
          settings
        );
      });
    });

    describe("refresh()", () => {
      it("should request the list of environment", async () => {
        const dummyEnvs = ["a", "b"];
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response(JSON.stringify({ environments: dummyEnvs }), {
            status: 200
          })
        );

        const envManager = new CondaEnvironments();

        const envs = await envManager.refresh();

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, "conda", "environments"),
          {
            method: "GET"
          },
          settings
        );

        expect(envs).toEqual(dummyEnvs);
      });
    });

    describe("remove()", () => {
      it("should request an environment deletion", async () => {
        const name = "toDelete";

        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response("", { status: 200 })
        );

        const envManager = new CondaEnvironments();

        const testSignal = testEmission(envManager.environmentChanged, {
          test: (manager, changes) => {
            expect(changes).toStrictEqual({
              name,
              source: null,
              type: "remove"
            });
          }
        });

        await envManager.remove(name);
        await testSignal;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, "conda", "environments", name),
          {
            method: "DELETE"
          },
          settings
        );
      });
    });

    describe("environments", () => {
      it("should request a refresh and return the environments", async () => {
        const dummyEnvs = ["a", "b"];
        (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(
          new Response(JSON.stringify({ environments: dummyEnvs }), {
            status: 200
          })
        );

        const envManager = new CondaEnvironments();

        const envs = await envManager.environments;

        expect(ServerConnection.makeRequest).toBeCalledWith(
          URLExt.join(settings.baseUrl, "conda", "environments"),
          {
            method: "GET"
          },
          settings
        );
        expect(envs).toEqual(dummyEnvs);
      });
    });
  });
});
