const redis = require('redis');
const got = require('got');
const fs = require('fs');
const http = require('http');
const httpProxy = require('http-proxy');
const child = require('child_process');
const mannwhitneyu = require('./mannwhitneyu')

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
        this.latency = [];
        this.requestResults = []; // 0 represents a successful call to /preview and 1 is a failure
        this.memoryLoad = [];
        this.cpu = [];
        this.scoreTrend = [];
    }
}

function runStatisticalUTest(list1, list2, metricName) {
    var lessTest = mannwhitneyu.test(list1, list2, 'less');
    var greaterTest = mannwhitneyu.test(list1, list2, 'greater');
    console.log(`${metricName} LESS: U=${lessTest.U}, p=${lessTest.p}`);
    console.log(`${metricName} GREATER: U=${greaterTest.U}, p=${greaterTest.p}`);
    if (lessTest.p < 0.05) {
        console.log(`${metricName}: LOW`);
        return 0;
    } else if (greaterTest.p < 0.05) {
        console.log(`${metricName}: HIGH`);
        return 0;
    } else {
        console.log(`${metricName}: PASS`);
        return 1;
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
    //console.log(`Received message from agent: ${channel}`)
    if (targetServer.name === channel) {
        let payload = JSON.parse(message);

        let captureServer = targetServer;
        captureServer.memoryLoad.push(payload.memoryLoad);
        captureServer.cpu.push(payload.cpu);
    }
});

// LATENCY CHECK
var latency = setInterval( function () 
{
    // Bind a new variable in order to for it to be properly captured inside closure.
    let captureServer = targetServer;

    // Make request to server we are monitoring.
    got.post(`http://localhost:3090/preview`, {timeout: 5000, throwHttpErrors: false, json: JSON.parse(fs.readFileSync('/bakerx/survey.json'))}).then(function(res)
    {
        // Instead of capturing the status code itself, record whether the request succeeded or failed, where
        // 0 indicates success and 1 indicates failure. A Mann-Whitley U test will be run on the "requestResults"
        // arrays for the two servers as part of canary analysis.
        if (res.statusCode === 200) {
            captureServer.requestResults.push(0);
        } else {
            captureServer.requestResults.push(1);
        }
        captureServer.latency.push(res.timings.phases.total);
    }).catch( e => 
    {
        captureServer.requestResults(1);
        captureServer.latency.push(5000);
    });
}, 1000);

let prod = new Production();
prod.proxy();

console.log(`Running siege to generate traffic to the blue deployment (${prod.TARGET}/preview)...`);
var siege = child.spawn(`siege`, [`-t60s`, `-d2`, `-c15`, `--content-type`, `"application/json"`, `'${prod.TARGET}/preview`, `POST`, `</bakerx/survey.json'`], {shell:true});

siege.stdout.on('data', function(data) {
    console.log(`${data}`);
});

siege.stderr.on('data', function(data) {
    console.log(`${data}`);
});

siege.on('close', function(code) {
    console.log('Switching proxy target to green deployment...')
    prod.TARGET = GREEN;
    targetServer = greenServer;

    console.log(`Running siege to generate traffic to the green deployment (${prod.TARGET}/preview)...`);
    siege = child.spawn(`siege`, [`-t60s`, `-d2`, `-c15`, `--content-type`, `"application/json"`, `'${prod.TARGET}/preview`, `POST`, `</bakerx/survey.json'`], {shell:true});

    siege.stdout.on('data', function(data) {
        console.log(`${data}`);
    });
    
    siege.stderr.on('data', function(data) {
        console.log(`${data}`);
    });

    siege.on('close', function(code) {
        clearInterval(latency);
        client.quit();
        prod.stopProxy();

        console.log('\n==============================================================================================');
        console.log('CANARY REPORT:\n');
        
        let passedMetrics = 0;
        passedMetrics += runStatisticalUTest(greenServer.memoryLoad, blueServer.memoryLoad, "MEMORY LOAD");
        console.log(`\nGREEN MEMORY: ${greenServer.memoryLoad}, SIZE: ${greenServer.memoryLoad.length}`);
        console.log(`\nBLUE MEMORY: ${blueServer.memoryLoad}, SIZE: ${blueServer.memoryLoad.length}\n`);
        passedMetrics += runStatisticalUTest(greenServer.cpu, blueServer.cpu, "CPU LOAD");
        console.log(`\nGREEN CPU: ${greenServer.cpu}, SIZE: ${greenServer.cpu.length}`);
        console.log(`\nBLUE CPU: ${blueServer.cpu}, SIZE: ${blueServer.cpu.length}\n`);
        passedMetrics += runStatisticalUTest(greenServer.latency, blueServer.latency, "LATENCY");
        console.log(`\nGREEN LATENCY: ${greenServer.latency}, SIZE: ${greenServer.latency.length}`);
        console.log(`\nBLUE LATENCY: ${blueServer.latency}, SIZE: ${blueServer.latency.length}\n`);
        passedMetrics += runStatisticalUTest(greenServer.requestResults, blueServer.requestResults, "FAILED REQUESTS");

        canaryScore = (passedMetrics / 4) * 100;
        console.log(`\nFINAL CANARY SCORE = (${passedMetrics} / 4) = ${canaryScore}%`);
        if (canaryScore !== 100) {
            console.log('CANARY FAILED!');
        }

        console.log('==============================================================================================\n')     
    });
});