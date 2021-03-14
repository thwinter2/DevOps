const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const fs = require('fs');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');
const [,, ... args] = process.argv;

//exports.command = 'build';
//exports.desc = 'Create the Jenkins Build Job';
//exports.builder = yargs => {
//    yargs.options({
//        privateKey: {
//            describe: 'Install the provided private key on the configuration server',
//            type: 'string'
//        }
//    });
//};


exports.handler = async argv => {
    const { privateKey } = argv;

    (async () => {

        await run( privateKey );

    })();

};

async function run(privateKey) {

    console.log(chalk.greenBright('Building checkbox.io job with JJB!'));

    console.log(chalk.blueBright('Creating Jenkins Job for checkbox.io...'));
    result = sshSync('/bakerx/cm/create-checkio-build-job.sh', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.blueBright('Starting checkbox.io Build Job...'));
    result = sshSync('node /bakerx/cm/start-build.js', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    //console.log(chalk.blueBright('Starting checkbox.io Build Job...'));
    //console.log(`Args: ${args}`);
    //result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} ${inventoryPath}`, 'vagrant@192.168.33.20');
    //if( result.error ) { process.exit( result.status ); }
}
