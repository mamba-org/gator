module.exports = {
  automock: false,
  moduleNameMapper: {
    "\\.(css|less|sass|scss)$": "identity-obj-proxy"
  },
  preset: "ts-jest/presets/js-with-babel",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testPathIgnorePatterns: ["/lib/", "/node_modules/"],
  testRegex: "src/.*/.*.spec.ts[x]?$",
  transformIgnorePatterns: ["/node_modules/(?!(@jupyterlab/.*)/)"],
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json"
    }
  }
};
