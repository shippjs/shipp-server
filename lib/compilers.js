/**

  Compilers

  • compile returns a promise that resolves to a function
  • compileFile returns a promise that resolves to a function

**/

/**

  Dependencies and exports

**/

var path = require("path")
var fs = require("fs")
var htmlMinifier = require("html-minifier")
var cleanCSS = new (require("clean-css"))()
var uglifyJS = require("uglify-js")



module.exports = {
  compile: compile,
  library: Library,
  compileFile: compileFile,
  addCompilers: addCompilers
}


HTML_MINIFIER_OPTIONS = {
  "removeComments": true,
  "removeCommentsFromCDATA": true,
  "removeCDATASectionsFromCDATA": true,
  "collapseWhitespace": true,
  "collapseBooleanAttributes": true,
  "removeAttributeQuotes": true,
  "removeRedundantAttributes": true,
  "useShortDoctype": true,
  "removeEmptyAttributes": true,
  "minifyJS": true,
  "minifyCSS": true
}


var DEFAULT_COMPILERS = {
  html: minifyHTML,
  js: minifyJS,
  css: minifyCSS
}

var Library = Object.assign({}, DEFAULT_COMPILERS)


/**

  Add compilers is an object where keys are extensions and value are compilers

**/

function addCompilers(compilers) {
  Object.assign(Library, compilers || {})
}


function minifyHTML(library, source) {
  return htmlMinifier.minify(source, HTML_MINIFIER_OPTIONS)
}


function minifyCSS(library, source) {
  return cleanCSS.minify(source).styles
}


function minifyJS(library, source) {
  return uglifyJS.minify(source).code
}


function readFile(filename) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, "utf8", function(err, contents) {
      if (err) return reject(err)
      resolve(contents)
    })
  })
}


function compile(ext, source, options) {
  var fn = Library[ext]
  if ("undefined" === typeof(fn))
    throw new Error("No compiler for file of extension: " + ext)
  return Promise.resolve(fn(Library, source, options)).then(function(compiled) {
    if ("function" === typeof compiled)
      return compiled
    else
      return function() { return compiled }
  })
}


function compileFile(filename, options) {
  var ext = path.parse(filename).ext.replace(/^\./, "")
  return readFile(filename).then(function(source) {
    return compile(ext, source, Object.assign({ filename: filename }, options))
  })
}

