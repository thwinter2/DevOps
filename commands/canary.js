const chalk = require('chalk');
const child = require('child_process');
const sshSync = require('../lib/ssh');
const scpSync = require('../lib/scp');
const path = require('path');

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

    result = sshSync(`forever start agent.js ${deploymentName}`, `vagrant@${ipAddress}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
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
    if( process.platform=='win32') {
        result = sshSync(`"curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash - && sudo apt-get -y install nodejs"`, `vagrant@${PROXY_SERVER_IP}`);
    } else {
        result = sshSync(`'curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash - && sudo apt-get -y install nodejs'`, `vagrant@${PROXY_SERVER_IP}`);
    }
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    configureCanaryServer(BLUE_IP, blueBranch, "blue");
    configureCanaryServer(GREEN_IP, greenBranch, "green");

    console.log(chalk.yellow('Starting proxy server and running canary analysis...'));
    result = sshSync(`node /bakerx/lib/proxy.js`, `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // Remove repos after analysis is complete
    sshSync('rm -f -r /home/vagrant/checkbox.io-micro-preview', `vagrant@${BLUE_IP}`);
    sshSync('rm -f -r /home/vagrant/checkbox.io-micro-preview', `vagrant@${GREEN_IP}`);
}