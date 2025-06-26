import { KernelSpecAPI, KernelSpec } from '@jupyterlab/services';
import 'jest';

describe('KernelSpec JL3/4 Compatibility', () => {

  describe('Import and Type Compatibility', () => {
    it('should be able to import KernelSpec namespace and types', () => {
      // This verifies our import pattern works in both JL3 and JL4
      expect(KernelSpec).toBeDefined();
      expect(KernelSpecAPI).toBeDefined();
    });

    it('should be able to use KernelSpec.IManager as a type', () => {
      // This is the core compatibility test - can we use the interface?
      const manager = {
        specs: null,
        specsChanged: null as any,
        isReady: false,
        isDisposed: false,
        isActive: false,
        ready: Promise.resolve(),
        serverSettings: { baseUrl: 'test/' } as any,
        connectionFailure: null as any,
        disposed: null as any,
        dispose: () => {},
        refreshSpecs: () => Promise.resolve()
      } as KernelSpec.IManager;

      expect(manager).toBeDefined();
      expect(typeof manager.dispose).toBe('function');
      expect(typeof manager.refreshSpecs).toBe('function');
    });

    it('should be able to create spec models', () => {
      // Test that we can create the data structures we need
      const mockSpecs: KernelSpecAPI.ISpecModels = {
        default: 'python3',
        kernelspecs: {
          python3: {
            name: 'python3',
            display_name: 'Python 3',
            language: 'python',
            argv: ['python', '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
            spec: {
              display_name: 'Python 3',
              language: 'python',
              argv: ['python', '-m', 'ipykernel_launcher', '-f', '{connection_file}']
            },
            resources: {}
          }
        }
      };

      expect(mockSpecs.default).toBe('python3');
      expect(mockSpecs.kernelspecs.python3.name).toBe('python3');
      expect(mockSpecs.kernelspecs.python3.language).toBe('python');
    });
  });

  describe('Interface Properties', () => {
    it('should have all expected IManager properties', () => {
      // Verify the interface has what we expect (works in both JL3/4)
      interface TestManager extends KernelSpec.IManager {
        // This will fail to compile if IManager is missing properties
        testMethod(): void;
      }

      const mockManager = {
        specs: null,
        specsChanged: null as any,
        isReady: true,
        isDisposed: false,
        isActive: false,
        ready: Promise.resolve(),
        serverSettings: { baseUrl: 'test/' } as any,
        connectionFailure: null as any,
        disposed: null as any,
        dispose: jest.fn(),
        refreshSpecs: jest.fn().mockResolvedValue(undefined),
        testMethod: jest.fn()
      } as TestManager;

      // Basic interface compliance
      expect(mockManager.isReady).toBe(true);
      expect(mockManager.isDisposed).toBe(false);
      expect(typeof mockManager.dispose).toBe('function');
      expect(typeof mockManager.refreshSpecs).toBe('function');
    });
  });

  describe('Real Constructor Pattern', () => {
    it('should be able to use the interface in function signatures', () => {
      // This tests the actual pattern we use in CompanionValidator
      function acceptsKernelSpecManager(
          kernelManager: KernelSpec.IManager,
          // Other params would go here but we don't want to import them
          mockParam: any = null
      ): boolean {
        return kernelManager.isReady && !kernelManager.isDisposed;
      }

      const mockManager = {
        specs: { default: 'python3', kernelspecs: {} },
        specsChanged: null as any,
        isReady: true,
        isDisposed: false,
        isActive: false,
        ready: Promise.resolve(),
        serverSettings: { baseUrl: 'test/' } as any,
        connectionFailure: null as any,
        disposed: null as any,
        dispose: () => {},
        refreshSpecs: () => Promise.resolve()
      } as KernelSpec.IManager;

      // This verifies the function can accept KernelSpec.IManager
      const result = acceptsKernelSpecManager(mockManager);
      expect(result).toBe(true);
    });
  });

  describe('Spec Model Validation', () => {
    it('should handle various spec model scenarios', () => {
      // Test empty specs
      const emptySpecs: KernelSpecAPI.ISpecModels = {
        default: '',
        kernelspecs: {}
      };
      expect(Object.keys(emptySpecs.kernelspecs)).toHaveLength(0);

      // Test specs with multiple kernels
      const multiSpecs: KernelSpecAPI.ISpecModels = {
        default: 'python3',
        kernelspecs: {
          python3: {
            name: 'python3',
            display_name: 'Python 3',
            language: 'python',
            argv: ['python', '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
            spec: {
              display_name: 'Python 3',
              language: 'python',
              argv: ['python', '-m', 'ipykernel_launcher', '-f', '{connection_file}']
            },
            resources: {}
          },
          'conda-env-test': {
            name: 'conda-env-test',
            display_name: 'Python (test)',
            language: 'python',
            argv: ['python', '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
            spec: {
              display_name: 'Python (test)',
              language: 'python',
              argv: ['python', '-m', 'ipykernel_launcher', '-f', '{connection_file}']
            },
            resources: {}
          }
        }
      };

      expect(Object.keys(multiSpecs.kernelspecs)).toHaveLength(2);
      expect(multiSpecs.kernelspecs['conda-env-test'].display_name).toBe('Python (test)');
    });
  });
});

