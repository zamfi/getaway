const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist")
  },
  node: {
    fs: "empty"
  },
  //erin add to not minify
  optimization : {
  	minimize: false,
  }
};
