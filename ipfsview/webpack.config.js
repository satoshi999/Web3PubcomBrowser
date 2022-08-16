const path = require('path');
const glob = require('glob');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fsExtra = require('fs-extra');
const webpack = require('webpack')

const SRC_PATH = './src/';
const DIST_PATH = './build/';
const STATIC_PATH = './public/';
const IGNORES = ["module", "component"].map(x => SRC_PATH + x);

const createEntrys = () => {
  const entrys = {};
  const targets = glob.sync(SRC_PATH + "/**/*.ts*", {ignore: IGNORES});
  targets.forEach((value) => {
    const key = value.replace(SRC_PATH, "").split(/\.ts*/)[0];
    entrys[key] = value;
  });
  return entrys;
};

fsExtra.removeSync(DIST_PATH);
const entrys = createEntrys();

module.exports = {
  mode: "production",
  entry: entrys,
  output: {
    path: path.resolve(__dirname, DIST_PATH),
    filename: '[name].js'
 },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader"
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options :{
              modules : true
            }
          },
          'postcss-loader','sass-loader'
        ],
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
    alias: { 
      crypto: "crypto-browserify",
      assert: "assert",
      buffer: "buffer",
      http: "stream-http",
      https: "https-browserify",
      os: "os-browserify/browser",
      path: "path-browserify",
      querystring: "querystring-es3",
      stream: "stream-browserify",
      url: "url",
      zlib: "browserify-zlib",
      constants: "constants-browserify"
    },
    fallback: {
      fs: false,
      net: false,
      tls: false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new CopyWebpackPlugin({
      patterns:[
        { from: '**/*', context: STATIC_PATH }
      ]
    })
  ]
}