const path = require("path");
const fs = require("fs");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Webpack entry points. Mapping from resulting bundle name to the source file entry.
const entries = {};

// Loop through subfolders in the "Samples" folder and add an entry for each one
const sourcesDir = path.join(__dirname, "src/");
fs.readdirSync(sourcesDir).filter((dir) => {
  if (
    fs.statSync(path.join(sourcesDir, dir)).isDirectory() &&
    dir !== "Components"
  ) {
    entries[dir] =
      "./" + path.relative(process.cwd(), path.join(sourcesDir, dir, dir));
  }
});

module.exports = (env, argv) => ({
  entry: entries,
  output: {
    filename: "[name]/[name].js",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      "azure-devops-extension-sdk": path.resolve(
        "node_modules/azure-devops-extension-sdk",
      ),
    },
  },
  stats: {
    warnings: false,
  },
  module: {
    rules: [
      {
        test: /\.ts|.js|.tsx$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: "asset/inline",
      },
      {
        test: /\.html$/,
        type: "asset/resource",
      },
    ],
  },
  optimization: {
    minimize: true,    
    usedExports: true,
    sideEffects: true,
    providedExports: true,
    innerGraph: true,
    concatenateModules: true,
    splitChunks: false,
    runtimeChunk: false,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "**/*.html", context: "src" }],
    }),
  ],
  ...(env.WEBPACK_SERVE
    ? {
        devtool: "inline-source-map",
        devServer: {
          server: "https",
          port: 3000,
        },
      }
    : {}),
});
