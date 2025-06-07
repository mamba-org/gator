/**
 * Local implementation of testEmission from @jupyterlab/testutils
 * Adapted to avoid ESM dependency issues while maintaining the same API
 * Remove during JupyterLab 4 upgrade
 */

import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import type { ISignal } from '@lumino/signaling';

/**
 * Test a single emission from a signal.
 *
 * @param signal - The signal we are listening to.
 * @param find - An optional function to determine which emission to test,
 * defaulting to the first emission.
 * @param test - An optional function which contains the tests for the emission, and should throw an error if the tests fail.
 * @param value - An optional value that the promise resolves to if the test is
 * successful.
 *
 * @returns a promise that rejects if the function throws an error (e.g., if an
 * expect test doesn't pass), and resolves otherwise.
 *
 * #### Notes
 * The first emission for which the find function returns true will be tested in
 * the test function. If the find function is not given, the first signal
 * emission will be tested.
 *
 * You can test to see if any signal comes which matches a criteria by just
 * giving a find function. You can test the very first signal by just giving a
 * test function. And you can test the first signal matching the find criteria
 * by giving both.
 *
 * The reason this function is asynchronous is so that the thing causing the
 * signal emission (such as a websocket message) can be asynchronous.
 */
export async function testEmission<T, U, V>(
  signal: ISignal<T, U>,
  options: {
    find?: (a: T, b: U) => boolean;
    test?: (a: T, b: U) => void;
    value?: V;
  } = {}
): Promise<V | undefined> {
  const done = new PromiseDelegate<V | undefined>();
  const object = {};

  signal.connect((sender, args) => {
    const shouldTest = options.find?.(sender, args) ?? true;
    
    if (shouldTest) {
      try {
        Signal.disconnectReceiver(object);
        if (options.test) {
          options.test(sender, args);
        }
      } catch (e) {
        done.reject(e);
        return;
      }
      done.resolve(options.value ?? undefined);
    }
  }, object);

  return done.promise;
}

/**
 * Convert a signal into a promise for the first emitted value.
 *
 * @param signal - The signal we are listening to.
 *
 * @returns a Promise that resolves with a `(sender, args)` pair.
 */
export function signalToPromise<T, U>(signal: ISignal<T, U>): Promise<[T, U]> {
  const done = new PromiseDelegate<[T, U]>();
  const object = {};

  signal.connect((sender, args) => {
    Signal.disconnectReceiver(object);
    done.resolve([sender, args]);
  }, object);

  return done.promise;
}

/**
 * Return a promise that resolves in the given milliseconds.
 */
export function sleep(milliseconds = 0): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined);
    }, milliseconds);
  });
}

/**
 * Convert a requestAnimationFrame into a Promise.
 */
export function framePromise(): Promise<void> {
  const done = new PromiseDelegate<void>();
  requestAnimationFrame(() => {
    done.resolve(undefined);
  });
  return done.promise;
}
