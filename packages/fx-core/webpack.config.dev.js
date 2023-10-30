const path = require("path");

const htmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const terserWebpackPlugin = require("terser-webpack-plugin");
module.exports = {
  target: "node", // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  //mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
  node: {
    __dirname: false,
  },
  entry: {
    "./js/index": path.join(__dirname, "./out/index.js"),
  },
  output: {
    environment: {
      // The environment supports arrow functions ('() => { ... }').
      // 环境支持箭头函数('()=>{…}”)。
      arrowFunction: false,
      // The environment supports BigInt as literal (123n).
      // 该环境支持将BigInt作为文字(123n)。
      bigIntLiteral: false,
      // The environment supports const and let for variable declarations.
      // 环境支持使用const和let声明变量。
      const: false,
      // The environment supports destructuring ('{ a, b } = obj').
      destructuring: false,
      // The environment supports an async import() function to import EcmaScript modules.
      // 该环境支持async import()函数来导入EcmaScript模块。
      dynamicImport: false,
      // The environment supports 'for of' iteration ('for (const x of array) { ... }').
      // 该环境支持'for of' iteration ('for (const x of array){…}”)
      forOf: false,
      // The environment supports ECMAScript Module syntax to import ECMAScript modules (import ... from '...').
      // 该环境支持ECMAScript Module语法来导入ECMAScript模块
      module: false,
    },
    // 出口目录
    path: path.join(__dirname, "./dist"),
    // 出口文件
    filename: "[name].js",
  },

  devtool: "source-map",
  externals: {
    commonjs: "commonjs", //Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    keytar: "keytar",
  },
  module: {
    rules: [
      {
        test: /(?<!\.d)\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            // options: {
            //   configFile: path.resolve(__dirname, './tsconfig.json'),
            // },
          },
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        exclude: /node_modules/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.(jpg|png|svg|gif)$/,
        use: {
          loader: "url-loader",
        },
      },
    ],
  },
  plugins: [
    new webpack.ContextReplacementPlugin(/express[\/\\]lib/, false, /$^/),
    new webpack.ContextReplacementPlugin(
      /applicationinsights[\/\\]out[\/\\]AutoCollection/,
      false,
      /$^/
    ),
    new webpack.ContextReplacementPlugin(/applicationinsights[\/\\]out[\/\\]Library/, false, /$^/),
    new webpack.ContextReplacementPlugin(/ms-rest[\/\\]lib/, false, /$^/),
    new webpack.IgnorePlugin({ resourceRegExp: /@opentelemetry\/tracing/ }),
    new webpack.IgnorePlugin({ resourceRegExp: /applicationinsights-native-metrics/ }),
    new webpack.IgnorePlugin({ resourceRegExp: /original-fs/ }),
    // ignore node-gyp/bin/node-gyp.js since it's not used in runtime
    new webpack.NormalModuleReplacementPlugin(
      /node-gyp[\/\\]bin[\/\\]node-gyp.js/,
      "@npmcli/node-gyp"
    ),
  ],
  optimization: {
    minimizer: [
      new terserWebpackPlugin({
        terserOptions: {
          mangle: false,
          keep_fnames: true,
        },
      }),
    ],
  },
};
module.exports = config;
