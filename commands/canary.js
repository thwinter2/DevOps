const chalk = require('chalk');
const child = require('child_process');
const http = require('http');
const httpProxy = require('http-proxy');
const sshSync = require('../lib/ssh');
const scpSync = require('../lib/scp');

exports.command = 'canary [blueBranch] [greenBranch]';
exports.desc = 'Performs canary analysis on the checkbox-io preview microservice';

exports.handler = async argv => {
    const { blueBranch, greenBranch } = argv;

    run( blueBranch, greenBranch);

};

const BLUE_IP = '192.168.44.25';
const BLUE  = `http://${BLUE_IP}:3000`;
const GREEN_IP = '192.168.44.30';
const GREEN = `http://${GREEN_IP}:3000`;

class Production
{
    constructor()
    {
        this.TARGET = GREEN;
    }

    async proxy()
    {
        let options = {};
        let proxy = httpProxy.createProxyServer(options);
        let self = this;
        // Redirect requests to the active TARGET (BLUE or GREEN)
        let server  = http.createServer(function(req, res)
        {
            // callback for redirecting requests.
            proxy.web( req, res, {target: self.TARGET } );
        });
        server.listen(3090);
   }
}

function run(blueBranch, greenBranch) {
    console.log(chalk.greenBright('Setting up canary environment!'));

    console.log(chalk.greenBright('Provisioning monitoring server...'));
    let result = child.spawnSync(`bakerx`, `run monitor queues --ip 192.168.44.92 --sync`.split(' '), 
        {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Provisioning blue server...'));
    result = child.spawnSync(`bakerx`, `run blue focal --ip ${BLUE_IP}`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Provisioning green server...'));
    result = child.spawnSync(`bakerx`, `run green focal --ip ${GREEN_IP}`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright(`Cloning ${blueBranch} on blue deployment...`))
    sshSync(`git clone https://github.com/chrisparnin/checkbox.io-micro-preview --branch ${blueBranch}`, `vagrant@${BLUE_IP}`);
    
    console.log(chalk.blueBright(`Cloning ${greenBranch} on green deployment...`))
    sshSync(`git clone https://github.com/chrisparnin/checkbox.io-micro-preview --branch ${greenBranch}`, `vagrant@${GREEN_IP}`);

    for (let server of [BLUE_IP, GREEN_IP]) {
        console.log(chalk.blueBright(`Starting checkbox.io app at ${server}...`));
        scpSync('./cm/start-preview-microservice.sh', `vagrant@${server}:/home/vagrant/start-preview-microservice.sh`);
        sshSync('./start-preview-microservice.sh', `vagrant@${server}`)
    }

    // Set up proxy server
    //let prod = new Production();
    //prod.proxy();
}