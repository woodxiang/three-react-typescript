import path from 'path';
import nodeExternals from 'webpack-node-externals';
import HtmlWebPackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const serverConfig: webpack.Configuration = {
  entry: {
    server: './src/server.ts',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name].js',
  },
  target: 'node',
  node: {
    __dirname: false, // if you don't put this is, __dirname
    __filename: false, // and __filename return blank or /
  },
  externals: [nodeExternals()],
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [
      {
        test: /\.{js|ts|tsx|jsx}$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              '@babel/preset-typescript',
            ],
            plugins: [
              '@babel/proposal-class-properties',
              '@babel/proposal-object-rest-spread',
              '@babel/plugin-transform-runtime',
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: 'src/asset', to: 'asset' }],
    }),
  ],
};
const clientConfig: webpack.Configuration = {
  target: 'web',
  entry: './src/index',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    modules: ['src', 'node_modules'],
  },
  module: {
    rules: [
      {
        test: /\.{js|ts|tsx|jsx}$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { browsers: 'defaults' } }],
              '@babel/preset-typescript',
              '@babel/preset-react',
            ],
            plugins: [
              '@babel/proposal-class-properties',
              '@babel/proposal-object-rest-spread',
              '@babel/plugin-transform-runtime',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.html$/,
        use: [{ loader: 'html-loader' }],
      },
      {
        test: /\.glsl$/,
        exclude: /node_modules/,
        use: [
          'raw-loader',
          {
            loader: 'glslify-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './src/index.html',
      filename: './index.html',
    }),
  ],
};

export default { serverConfig, clientConfig };
