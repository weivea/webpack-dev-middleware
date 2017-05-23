/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
var mime = require("mime");
var getFilenameFromUrl = require("./lib/GetFilenameFromUrl");
var Shared = require("./lib/Shared");
var pathJoin = require("./lib/PathJoin");

// constructor for the middleware
module.exports = function(compiler, options) {

	var context = {
		state: false,
		webpackStats: undefined,
		callbacks: [],
		options: options,
		compiler: compiler,
		watching: undefined,
		forceRebuild: false
	};
	var shared = Shared(context);


	// The middleware function
	function webpackDevMiddleware(req, res, next) {
		function goNext() {
			if(!context.options.serverSideRender) return next();
			shared.ready(function() {
				res.locals.webpackStats = context.webpackStats;
				next();
			}, req);
		}

		if(req.method !== "GET") {
			return goNext();
		}

		var filename = getFilenameFromUrl(context.options.publicPath, context.compiler, req.url);
		if(filename === false) return goNext();


		shared.handleRequest(filename, processRequest, req);

		function processRequest() {
			// 我的修改~~/////
			if(context.options.serverSideRender && /\.html$/.test(req.url)){
				return goNext();
			}
			/////
			try {
				var stat = context.fs.statSync(filename);
				if(!stat.isFile()) {
					if(stat.isDirectory()) {
						filename = pathJoin(filename, context.options.index || "index.html");
						stat = context.fs.statSync(filename);
						if(!stat.isFile()) throw "next";
					} else {
						throw "next";
					}
				}
			} catch(e) {
				return goNext();
			}

			// server content
			var content = context.fs.readFileSync(filename);
			content = shared.handleRangeHeaders(content, req, res);
			res.setHeader("Content-Type", mime.lookup(filename) + "; charset=UTF-8");
			res.setHeader("Content-Length", content.length);
			if(context.options.headers) {
				for(var name in context.options.headers) {
					res.setHeader(name, context.options.headers[name]);
				}
			}

			if(res.send) res.send(content);
			else res.end(content);
		}
	}

	webpackDevMiddleware.getFilenameFromUrl = getFilenameFromUrl.bind(this, context.options.publicPath, context.compiler);
	webpackDevMiddleware.waitUntilValid = shared.waitUntilValid;
	webpackDevMiddleware.invalidate = shared.invalidate;
	webpackDevMiddleware.close = shared.close;
	webpackDevMiddleware.fileSystem = context.fs;
	return webpackDevMiddleware;
};
