const redis = require('redis');
const got = require('got');
const fs = require('fs');
const http = require('http');
const httpProxy = require('http-proxy');
const child = require('child_process');

const BLUE  = `http://192.168.44.25:3000`;
const GREEN = `http://192.168.44.30:3000`;

class Production
{
    constructor()
    {
        this.TARGET = BLUE;
    }

    async proxy()
    {
        let options = {};
        let proxy = httpProxy.createProxyServer(options);
        let self = this;
        // Redirect requests to the active TARGET (BLUE or GREEN)
        this.server  = http.createServer(function(req, res)
        {
            // callback for redirecting requests.
            proxy.web( req, res, {target: self.TARGET } );
        });
        this.server.listen(3090);
   }

   stopProxy() {
       this.server.close();
   }
}

class Server {
    constructor(name) {
        this.name = name;
        this.scoreTrend = [];
    }

    updateHealth() {
	    let score = 0;
	    // Update score calculation.
	    if (this.cpu <= 90) {
		    score++;
	    }
	    if (this.memoryLoad <= 90) {
		    score++;
	    }
	    if (this.statusCode == 200) {
		    score++;
	    }
	    if (this.latency < 5000) {
		    score++;
	    }

	    //console.log(`${this.name} ${score}`);

	    // Add score to trend data.
	    this.scoreTrend.push( (4-score));
	    if( this.scoreTrend.length > 100 )
	    {
		    this.scoreTrend.shift();
	    }
    }
}

blueServer = new Server("blue");
greenServer = new Server("green");

targetServer = blueServer;

/////////////////////////////////////////////////////////////////////////////////////////
// REDIS SUBSCRIPTION
/////////////////////////////////////////////////////////////////////////////////////////
var client = redis.createClient(6379, 'localhost', {});
// We subscribe to all the data being published by the server's metric agent.
for( var server of [blueServer, greenServer] )
{
    // The name of the server is the name of the channel to recent published events on redis.
    client.subscribe(server.name);
}

// When an agent has published information to a channel, we will receive notification here.
client.on("message", function (channel, message) 
{
    //console.log('Redis?');
    //console.log(`Received message from agent: ${channel}`)
    if (targetServer.name == channel) {
        let payload = JSON.parse(message);
        targetServer.memoryLoad = payload.memoryLoad;
        targetServer.cpu = payload.cpu;
        targetServer.updateHealth();
    }
});

// LATENCY CHECK
var latency = setInterval( function () 
{
    //console.log('Called?');
    // Bind a new variable in order to for it to be properly captured inside closure.
    let captureServer = targetServer;

    // Make request to server we are monitoring.
    got.post(`http://localhost:3090/preview`, {timeout: 5000, throwHttpErrors: false, json: JSON.parse(fs.readFileSync('/bakerx/survey.json'))}).then(function(res)
    {
        captureServer.statusCode = res.statusCode;
        captureServer.latency = res.timings.phases.total;
    }).catch( e => 
    {
        // console.log(e);
        captureServer.statusCode = e.code;
        captureServer.latency = 5000;
    });
}, 10000);

let prod = new Production();
prod.proxy();

console.log(`Running siege to generate traffic against the blue deployment (${prod.TARGET}/preview)...`);
var siege = child.spawn(`siege`, [`-b`, `-t60s`, `--content-type`, `"application/json"`, `'${prod.TARGET}/preview`, `POST`, `</bakerx/survey.json'`], {shell:true});

siege.stdout.on('data', function(data) {
    console.log(`${data}`);
});

siege.stderr.on('data', function(data) {
    console.log(`${data}`);
});

siege.on('close', function(code) {
    var blueServerScoreTrend = blueServer.scoreTrend;
    console.log('Switching proxy target to green deployment...')
    prod.TARGET = GREEN;
    targetServer = greenServer;

    console.log(`Running siege to generate traffic against the green deployment (${prod.TARGET}/preview)...`);
    siege = child.spawn(`siege`, [`-b`, `-t60s`, `--content-type`, `"application/json"`, `'${prod.TARGET}/preview`, `POST`, `</bakerx/survey.json'`], {shell:true});

    siege.stdout.on('data', function(data) {
        console.log(`${data}`);
    });
    
    siege.stderr.on('data', function(data) {
        console.log(`${data}`);
    });

    siege.on('close', function(code) {
        let greenServerScoreTrend = greenServer.scoreTrend;

        for (let score of blueServerScoreTrend) {
            console.log(`BLUE: ${score}`);
        }
    
        for (let score of greenServerScoreTrend) {
            console.log(`GREEN: ${score}`);
        }
    
        clearInterval(latency);
        client.quit();
        prod.stopProxy();
    });
});