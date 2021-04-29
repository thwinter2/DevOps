const redis = require('redis');
const got = require('got');
const fs = require('fs');
const child_process = require('child_process');
const chalk = require('chalk');

/// Servers data being monitored.
var servers = 
[
	{name: "blue", scoreTrend : [0]},
	{name: "green", scoreTrend : [0]}
];

var targetServer = "blue";

/////////////////////////////////////////////////////////////////////////////////////////
// REDIS SUBSCRIPTION
/////////////////////////////////////////////////////////////////////////////////////////
let client = redis.createClient(6379, 'localhost', {});
// We subscribe to all the data being published by the server's metric agent.
for( var server of servers )
{
	// The name of the server is the name of the channel to recent published events on redis.
	client.subscribe(server.name);
}

// When an agent has published information to a channel, we will receive notification here.
client.on("message", function (channel, message) 
{
	console.log(`Received message from agent: ${channel}`)
	for( var server of servers )
	{
		// Update our current snapshot for a server's metrics.
		if( server.name == channel && server.name == targetServer ) // Only collect metrics for target server
		{
			let payload = JSON.parse(message);
			server.memoryLoad = payload.memoryLoad;
			server.cpu = payload.cpu;
			updateHealth(server);
		}
	}
});

// LATENCY CHECK
var latency = setInterval( function () 
{
    // Bind a new variable in order to for it to be properly captured inside closure.
    let captureServer;
    for (let server of servers) {
        if (server.name == targetServer) {
            captureServer = server;
        }
    }

	// Make request to server we are monitoring.
	got.post("http://localhost:3090", {timeout: 5000, throwHttpErrors: false, json: JSON.parse(fs.readFileSync('/bakerx/survey.json'))}).then(function(res)
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

function updateHealth(server)
{
	let score = 0;
	// Update score calculation.
	if (server.cpu <= 0.9) {
		score++;
	}
	if (server.memoryLoad <= 0.9) {
		score++;
	}
	if (server.statusCode == 200) {
		score++;
	}
	if (server.latency < 5000) {
		score++;
	}

	console.log(`${server.name} ${score}`);

	// Add score to trend data.
	server.scoreTrend.push( (4-score));
	if( server.scoreTrend.length > 100 )
	{
		server.scoreTrend.shift();
	}
}

/////////////////////////////////////////////////////////////////////////////////////////
// Generate load on servers
/////////////////////////////////////////////////////////////////////////////////////////
console.log(chalk.blueBright('Running siege to generate traffic on the blue deployment...'));

result = child_process.execSync(`siege -t60s --content-type "application/json" 'http://localhost:3090 POST </bakerx/survey.json'`);
if( result.error ) { console.log(result.error); process.exit( result.status ); }
	
let blueScoreTrend = [...servers[0].scoreTrend];
console.log(`Blue deployment canary scores: ${blueScoreTrend}`);
	
// Proxy will switch target server after 60 seconds using setTimeout
targetServer = "green";
	
console.log(chalk.greenBright('Running siege to generate traffic on the green deployment...'));
result = child_process.execSync(`siege -t60s --content-type "application/json" 'http://localhost:3090 POST </bakerx/survey.json'`);
if( result.error ) { console.log(result.error); process.exit( result.status ); }
	
let greenScoreTrend = [...servers[1].scoreTrend];
console.log(`Green deployment canary scores: ${greenScoreTrend}`);
clearInterval(latency);
client.quit();