function errorExit(msg) {
	console.log("BasicCookieAuth: "+msg);
	process.exit(1);
}

function configTypeCheck(config, key, type) {
	if (config[key] == undefined) errorExit(key+" not specified");
	if (typeof config[key] != type) errorExit(key+" not a "+type);
}

function cookieParser(req, res, next) {
	if (req.cookies) return next();
	req.cookies = {};

	if (!req.headers.cookie) return next();

	req.headers.cookie.split("; ").forEach(cookie=>{
		cookie = cookie.split("=");
		if (cookie.length<2) return;
		req.cookies[cookie[0]] = cookie[1];
	});

	next();
}

function urlEncodedParser(req, res, next) {
	req.rawBody = "";
	req.setEncoding("utf8");

	req.on("data", function(chunk) { 
		req.rawBody += chunk;
	});

	req.on("end", function() {
		req.body = {};

		req.rawBody.split("&").forEach(pair=>{
			pair = pair.split("=");
			req.body[decodeURIComponent(pair[0])] =
				decodeURIComponent(pair[1]);
		});

		next();
	});
}

function generateString(length) {
	let out = "";
	let dictionary = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
		.split("");

	for (let i=0; i<length; i++) {
		out += dictionary[Math.floor(Math.random()*dictionary.length)];
	}

	return out;
}

module.exports = function(config) {
	if (typeof config != "object") errorExit("No object specified");

	configTypeCheck(config, "expressApp", "function");

	configTypeCheck(config, "loginPath", "string");
	configTypeCheck(config, "loginRedirect", "string");

	configTypeCheck(config, "logoutPath", "string");
	configTypeCheck(config, "logoutRedirect", "string");

	configTypeCheck(config, "sessionDuration", "number");

	configTypeCheck(config, "loginHandler", "function");
	configTypeCheck(config, "loginHTML", "string");

	this.sessions = [];

	this.middlewareDontRedirect = (req, res, next)=>{
		req._dontRedirect = true;
		this.middleware(req, res, ()=>{
			delete req["_dontRedirect"];
			next();
		});
	};

	this.middleware = (req, res, next)=>{
		req.authed = false;

		cookieParser(req, res, ()=>{
			// no session cookie
			if (!req.cookies.session) {
				if (req._dontRedirect) return next();
				return res.redirect(config.loginPath);
			}

			// invalid session
			if (!this.sessions.includes(req.cookies.session)) {
				res.clearCookie("session");

				if (req._dontRedirect) return next();
				return res.redirect(config.loginPath);
			}

			req.authed = true;
			next();
		});
	};

	config.expressApp.get(config.loginPath, this.middlewareDontRedirect, (req,res)=>{
		if (req.authed) return res.redirect(config.loginRedirect);
		res.send(config.loginHTML);
	});

	config.expressApp.post(config.loginPath, urlEncodedParser, (req,res)=>{
		config.loginHandler(req.body, ()=>{
			
			let session = generateString(16);
			this.sessions.push(session);

			// set cookie
			res.cookie("session", session, {
				expires: new Date(Date.now()+(config.sessionDuration*1000)),
			});

			// timer to clear session
			setTimeout(()=>{
				this.sessions.splice(this.sessions.indexOf(session),1);
			}, config.sessionDuration*1000);

			res.redirect(config.loginRedirect);
		}, ()=>{
			// incorrect
			res.redirect(config.loginPath);
		});
	});

	config.expressApp.get(config.logoutPath, cookieParser, (req,res)=>{
		res.clearCookie("session");
		res.redirect(config.logoutRedirect);
	});

	return this;
};