import { merge } from 'webpack-merge';
import path from 'path';
import common from './webpack.common';
import 'webpack-dev-server';

export default [
  merge(common.clientConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, './dist'),
      },
      port: 8081,
      proxy: {
        '/api': {
          target: 'http://localhost:17890',
          pathRewrite: { '^/api': '' },
        },
      },
    },
  }),
];
