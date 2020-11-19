import { merge } from 'webpack-merge';
import path from 'path';
import common from './webpack.common';

export default [
  merge(common.clientConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
      contentBase: path.join(__dirname, './dist'),
      port: 8081,
      proxy: {
        '/api': {
          target: 'http://localhost:7890',
          pathRewrite: { '^/api': '' },
        },
      },
    },
  }),
];
