//* Load .env
require('dotenv').load();

//* Import stuff
const express = require('express')
const app = express()

//* Disallow direct access when using proxy
if(process.env.proxySecure == "true"){
	var AccessControl = require('express-ip-access-control');
	var options = {
	    mode: 'allow',
	    allows: process.env.proxySecureIp.split(','),
	    log: function(clientIp, access) {
	        console.log(clientIp + (access ? ' accessed.' : ' denied.'));
	    },
	    statusCode: 401,
	    message: 'Unauthorized'
	};
	app.use(AccessControl(options));
}

//* Set API Headers
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//* API endpoints
app.get('/credits', require('./pages/credits'))
app.get('/getServices', require('./pages/getServices'))
app.get('/langStatus', require('./pages/langStatus'))

require('./util/langUpdater').run()
setInterval(require('./util/langUpdater').run, 5*60*1000)

//* Listen to port 8080
app.listen(8080, function () {
  console.log('PreMiD-API listening on port 8080!')
})