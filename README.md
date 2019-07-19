# Basic Cookie Auth
> 🍪 Cookies and sessions for logging in

This module is really basic for now. I recommed you read through `index.js` to fully understand.

Here's an example of how it works:

```js
var fs = require("fs");
var express = require("express");
var app = express();

var auth = require("./BasicCookieAuth.js")({
	expressApp: app,

	loginPath: "/login",
	loginRedirect: "/admin",
	
	logoutPath: "/logout",
	logoutRedirect: "/",
	
	sessionDuration: 60*60*24*1, // 1 day
	
	loginHandler: (details, yes, no)=>{
		if (details.password === "mypassword") {
			yes();
		} else {
			no();
		}
	},
	loginHTML: `
		<form method="POST" action="/login">
			<input name="password" type="password" placeholder="Password"/>
			<input type="submit" value="Login"/>
		</form>
	`,
});

app.get("/admin", auth.middleware, (req, res)=>{
	// req.authed == true
	res.send("You are logged in on the admin page. <a href='/logout'>Logout</a>");
});

app.get("/", (req, res)=>{
	res.send("Welcome! Visit the <a href='/admin'>admin page</a>");
});

app.listen(8080, ()=>{
	console.log("Server up");
});```