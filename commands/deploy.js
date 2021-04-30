const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const fs = require('fs');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = 'deploy [application]';
exports.desc = 'Deploy the application to the production environment';
exports.builder = yargs => {
    yargs.options({
        i: {
            describe: 'The inventory file used for deployment',
            type: 'string',
        }
    });
};

exports.handler = async argv => {

    (async () => {

        const {application,inventory} = argv;
        
        await run(application, inventory);

    })();

};

async function run(application, inventory){

    console.log(chalk.greenBright('Installing configuration server!'));

    // Transforming path of the files in host to the path in VM's shared folder
    let filePath = '/bakerx/cm/playbookDeployment.yml';

    console.log(chalk.blueBright('Running ansible script...'));
    result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} ${inventory}`, 'vagrant@192.168.33.20');
    if( result.error ) { process.exit( result.status ); }
}
