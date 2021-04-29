const chalk = require('chalk');
const child = require('child_process');
const http = require('http');
const httpProxy = require('http-proxy');
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

function run(blueBranch, greenBranch) {
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

    console.log(chalk.blueBright(`Cloning ${blueBranch} on blue deployment...`))
    result = sshSync(`git clone https://github.com/chrisparnin/checkbox.io-micro-preview --branch ${blueBranch}`, `vagrant@${BLUE_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.greenBright(`Cloning ${greenBranch} on green deployment...`))
    result = sshSync(`git clone https://github.com/chrisparnin/checkbox.io-micro-preview --branch ${greenBranch}`, `vagrant@${GREEN_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    let agentJS = path.join(__dirname, '../agent/index.js');
    let package = path.join(__dirname, '../agent/package.json');

    for (let server of [BLUE_IP, GREEN_IP]) {
        console.log(chalk.blueBright(`Starting checkbox.io app at ${server} and configuring monitoring agents...`));

        result = scpSync('./cm/start-preview-microservice.sh', `vagrant@${server}:/home/vagrant/start-preview-microservice.sh`);
        if( result.error ) { console.log(result.error); process.exit( result.status ); }

        result = sshSync('./start-preview-microservice.sh', `vagrant@${server}`);
        if( result.error ) { console.log(result.error); process.exit( result.status ); }

        result = scpSync(agentJS, `vagrant@${server}:/home/vagrant/agent.js`);
        if( result.error ) { console.log(result.error); process.exit( result.status ); }

        result = scpSync(package, `vagrant@${server}:/home/vagrant/package.json`);
        if( result.error ) { console.log(result.error); process.exit( result.status ); }

        result = sshSync(`npm install`, `vagrant@${server}`);
        if( result.error ) { console.log(result.error); process.exit( result.status ); }

        result = sshSync(`\"sudo apt-get -y install redis-server\"`, `vagrant@${server}`);
        if( result.error ) { console.log(result.error); process.exit( result.status ); }
        
        result = scpSync('./cm/install-redis.sh', `vagrant@${server}:/home/vagrant/install-redis.sh`);
        if( result.error ) { console.log(result.error); process.exit( result.status ); }

        result = sshSync('./install-redis.sh', `vagrant@${server}`);
        if( result.error ) { console.log(result.error); process.exit( result.status ); }
    }

    result = sshSync(`\"forver restart agent.js blue || forever start agent.js blue\"`, `vagrant@${BLUE_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync(`\"forver restart agent.js green || forever start agent.js green\"`, `vagrant@${GREEN_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = scpSync('./cm/install-redis.sh', `vagrant@${PROXY_SERVER_IP}:/home/vagrant/install-redis.sh`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync('./install-redis.sh', `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.yellow('Installing siege command line tool on proxy server...'));
    result = sshSync('sudo apt-get install siege', `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.yellow('Installing NPM on proxy server and launching proxy...'));
    result = sshSync(`\"curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash - && sudo apt-get -y install nodejs\"`, `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync('sudo npm install forever -g', `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync(`\"forever restart /bakerx/lib/proxy.js || forever start /bakerx/lib/proxy.js\"`, `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    result = sshSync('node /bakerx/lib/metrics.js', `vagrant@${PROXY_SERVER_IP}`);
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // Remove repos after analysis is complete
    sshSync('rm -f -r /home/vagrant/checkbox.io-micro-preview', `vagrant@${BLUE_IP}`);
    sshSync('rm -f -r /home/vagrant/checkbox.io-micro-preview', `vagrant@${GREEN_IP}`);
}