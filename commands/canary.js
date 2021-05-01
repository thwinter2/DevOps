const chalk = require('chalk');
const child = require('child_process');
const http = require('http');
const httpProxy = require('http-proxy');
const sshSync = require('../lib/ssh');
const scpSync = require('../lib/scp');
const path = require('path');
const redis = require('redis');
const got = require('got');
const fs = require('fs');

exports.command = 'canary [blueBranch] [greenBranch]';
exports.desc = 'Performs canary analysis on the checkbox-io preview microservice';

exports.handler = async argv => {
    const { blueBranch, greenBranch } = argv;

    run( blueBranch, greenBranch);

};

const BLUE_IP = '192.168.44.25';
const GREEN_IP = '192.168.44.30';
const PROXY_SERVER_IP = '192.168.44.92';

var agentJS = path.join(__dirname, '../agent/index.js');
var package = path.join(__dirname, '../agent/package.json');

class Server {
    constructor(name) {
        this.name = name;
        this.scoreTrend = [];
    }

    updateHealth() {
	    let score = 0;
	    // Update score calculation.
	    if (this.cpu <= 70) {
		    score++;
	    }
	    if (this.memoryLoad <= 70) {
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
	    //if( this.scoreTrend.length > 100 )
	    //{
		//    this.scoreTrend.shift();
	    //}
    }
}

function configureCanaryServer(ipAddress, gitBranch, deploymentName) {
    console.log(chalk.blueBright(`Cloning ${gitBranch} on ${deploymentName} deployment...`))
    result = sshSync(`git clone https://github.com/chrisparnin/checkbox.io-micro-preview --branch ${gitBranch}`, `vagrant@${ipAddress}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright(`Starting checkbox.io app on ${deploymentName} deployment and configuring monitoring agents...`));

    result = scpSync('./cm/start-preview-microservice.sh', `vagrant@${ipAddress}:/home/vagrant/start-preview-microservice.sh`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync('./start-preview-microservice.sh', `vagrant@${ipAddress}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = scpSync(agentJS, `vagrant@${ipAddress}:/home/vagrant/agent.js`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = scpSync(package, `vagrant@${ipAddress}:/home/vagrant/package.json`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync(`npm install`, `vagrant@${ipAddress}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync(`\"sudo apt-get -y install redis-server\"`, `vagrant@${ipAddress}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    result = scpSync('./cm/install-redis.sh', `vagrant@${ipAddress}:/home/vagrant/install-redis.sh`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync('./install-redis.sh', `vagrant@${ipAddress}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync(`\"forver restart agent.js ${deploymentName} || forever start agent.js ${deploymentName}\"`, `vagrant@${ipAddress}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
}

async function performCanaryAnalysis() {
    blueServer = new Server("blue");
    greenServer = new Server("green");

    targetServer = blueServer;

    /////////////////////////////////////////////////////////////////////////////////////////
    // REDIS SUBSCRIPTION
    /////////////////////////////////////////////////////////////////////////////////////////
    let client = redis.createClient(6379, PROXY_SERVER_IP, {});
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
        // Bind a new variable in order to for it to be properly captured inside closure.
        let captureServer = targetServer;

	    // Make request to server we are monitoring.
	    got.post(`http://${PROXY_SERVER_IP}:3090/preview`, {timeout: 5000, throwHttpErrors: false, json: JSON.parse(fs.readFileSync('./survey.json'))}).then(function(res)
	    {
		    captureServer.statusCode = res.statusCode;
		    captureServer.latency = res.timings.phases.total;
	    }).catch( e => 
	    {
		    // console.log(e);
		    captureServer.statusCode = e.code;
		    captureServer.latency = 5000;
	    });
    }, 1000);

    //console.log(chalk.blueBright(`Running siege to generate traffic on the ${targetServer.name} deployment...`));
    //result = sshSync('node /bakerx/lib/load.js', `vagrant@${PROXY_SERVER_IP}`);
    //if( result.error ) { console.log(result.error); process.exit( result.status ); }
    await new Promise(r => setTimeout(r, 60000));

    let blueServerScoreTrend = blueServer.scoreTrend;

    // Proxy will switch target server after 60 seconds using setTimeout
    targetServer = greenServer;

    //console.log(chalk.blueBright(`Running siege to generate traffic on the ${targetServer.name} deployment...`));
    //result = sshSync('node /bakerx/lib/load.js', `vagrant@${PROXY_SERVER_IP}`);
    //if( result.error ) { console.log(result.error); process.exit( result.status ); }
    await new Promise(r => setTimeout(r, 60000));

    let greenServerScoreTrend = greenServer.scoreTrend;

    for (let score of blueServerScoreTrend) {
        console.log(chalk.blue(`BLUE: ${score}`));
    }

    for (let score of greenServerScoreTrend) {
        console.log(chalk.green(`GREEN: ${score}`));
    }

    clearInterval(latency);
    client.quit();
}

async function run(blueBranch, greenBranch) {
    console.log(chalk.yellow('Setting up canary environment!'));

    console.log(chalk.yellow('Provisioning proxy server...'));
    let result = child.spawnSync(`bakerx`, `run proxy focal --ip ${PROXY_SERVER_IP} --sync`.split(' '), 
        {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Provisioning blue server...'));
    result = child.spawnSync(`bakerx`, `run blue focal --ip ${BLUE_IP}`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.greenBright('Provisioning green server...'));
    result = child.spawnSync(`bakerx`, `run green focal --ip ${GREEN_IP}`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = scpSync('./cm/install-redis.sh', `vagrant@${PROXY_SERVER_IP}:/home/vagrant/install-redis.sh`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync('./install-redis.sh', `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.yellow('Installing siege command line tool on proxy server...'));
    result = sshSync('sudo apt-get install siege', `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.yellow('Installing NPM on proxy server...'));
    result = sshSync(`\"curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash - && sudo apt-get -y install nodejs\"`, `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync('sudo npm install forever -g', `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    configureCanaryServer(BLUE_IP, blueBranch, "blue");
    configureCanaryServer(GREEN_IP, greenBranch, "green");

    console.log(chalk.yellow('Starting proxy server...'));
    result = sshSync(`\"forever restart /bakerx/lib/proxy.js || forever start /bakerx/lib/proxy.js\"`, `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    await performCanaryAnalysis();

    // Remove repos after analysis is complete
    sshSync('rm -f -r /home/vagrant/checkbox.io-micro-preview', `vagrant@${BLUE_IP}`);
    sshSync('rm -f -r /home/vagrant/checkbox.io-micro-preview', `vagrant@${GREEN_IP}`);
}