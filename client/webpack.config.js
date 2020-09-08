"use strict";
const HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
  entry: "./src/index.tsx",
  resolve: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
  module: {
    rules: [
      { test: /\.html$/, use: { loader: "html-loader" } },
      { test: /\.css$/, use: ["style-loader", "css_loader"] },
      { test: /\.tsx$/, loader: "awesome-typescript-loader" },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "./index.html",
    }),
  ],
  devtool: "#source-map",
};
