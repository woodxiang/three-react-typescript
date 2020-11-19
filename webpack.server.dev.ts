import { merge } from 'webpack-merge';
import common from './webpack.common';

export default [
  merge(common.serverConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
  }),
];
