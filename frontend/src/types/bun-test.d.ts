declare module 'bun:test' {
  export const test: (name: string, fn: () => unknown | Promise<unknown>) => void;
  export const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toBeNull: () => void;
    toContain: (expected: string) => void;
    not: {
      toContain: (expected: string) => void;
    };
  };
  export const mock: {
    module: (specifier: string, factory: () => Record<string, unknown>) => void;
  };
}
