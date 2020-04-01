module.exports = {
  automock: false,
  moduleNameMapper: {
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg)$": "@jupyterlab/testutils/lib/jest-file-mock.js"
  },
  preset: "ts-jest/presets/js-with-babel",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFilesAfterEnv: ["@jupyterlab/testutils/lib/jest-script.js"],
  setupFiles: ["<rootDir>/scripts/jest-setup-files.js"],
  testPathIgnorePatterns: ["/lib/", "/node_modules/"],
  testRegex: "src/.*/.*.spec.ts[x]?$",
  transform: {
    "\\.(ts|tsx)?$": "ts-jest",
    "\\.(js|jsx)?$": "<rootDir>/scripts/jest-transform.js",
    "\\.svg$": "jest-raw-loader"
  },
  transformIgnorePatterns: ["/node_modules/(?!(@jupyterlab/.*)/)"],
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json"
    }
  }
};
