const path = require("node:path");
const babel = require("@rollup/plugin-babel").default;
const nodeResolve = require("@rollup/plugin-node-resolve").default;
const copy = require("rollup-plugin-copy");

const {
  copyToPlaygrounds,
  createBanner,
  getOutputDir,
  isBareModuleId,
  magicExportsPlugin,
} = require("../../rollup.utils");
const { name: packageName, version } = require("./package.json");

/** @returns {import("rollup").RollupOptions[]} */
module.exports = function rollup() {
  let sourceDir = path.join("packages", "remix-storybook");
  let outputDir = getOutputDir(packageName);
  let outputDist = path.join(outputDir, "dist");

  let sharedPlugins = [
    babel({
      babelHelpers: "bundled",
      exclude: /node_modules/,
      extensions: [".ts", ".tsx"],
    }),
    nodeResolve({ extensions: [".ts", ".tsx"] }),
    copyToPlaygrounds(),
  ];

  /** @type {import("rollup").RollupOptions} */
  let remixStorybookCJS = {
    external(id) {
      return isBareModuleId(id);
    },
    input: path.join(sourceDir, "index.ts"),
    output: {
      banner: createBanner(packageName, version),
      dir: outputDist,
      format: "cjs",
      preserveModules: true,
      exports: "auto",
    },
    plugins: [
      ...sharedPlugins,
      magicExportsPlugin({ packageName, version }),
      copy({
        targets: [
          { src: "LICENSE.md", dest: [outputDir, sourceDir] },
          { src: path.join(sourceDir, "package.json"), dest: outputDir },
          { src: path.join(sourceDir, "README.md"), dest: outputDir },
        ],
      }),
    ],
  };

  // The browser build of remix-storybook is ESM so we can treeshake it.
  /** @type {import("rollup").RollupOptions} */
  let remixStorybookESM = {
    external(id) {
      return isBareModuleId(id);
    },
    input: path.join(sourceDir, "index.ts"),
    output: {
      banner: createBanner(packageName, version),
      dir: path.join(outputDist, "esm"),
      format: "esm",
      preserveModules: true,
    },
    plugins: [...sharedPlugins],
  };

  return [remixStorybookCJS, remixStorybookESM];
};
