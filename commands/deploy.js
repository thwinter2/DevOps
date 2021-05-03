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
            alias: 'inventory'
        }
    });
};

exports.handler = async argv => {
    
    (async () => {
        
        const {inventory, application} = argv;
        
        await run(inventory, application);

    })();

};

async function run(inventory, application){

    result = sshSync(`cp /bakerx/.ssh/* /home/vagrant/.ssh/`, 'vagrant@192.168.33.20');
    if( result.error ) { process.exit( result.status ); }

    result = sshSync(`chmod 600 /home/vagrant/.ssh/digitalocean_rsa`, 'vagrant@192.168.33.20');
    if( result.error ) { process.exit( result.status ); }

    let filePath = '';

    // Transforming path of the files in host to the path in VM's shared folder
    if(application == 'iTrust'){
        filePath = '/bakerx/cm/playbookitrust.yml';
    }
    else if(application == 'checkbox.io'){
        filePath = '/bakerx/cm/playbookCheckbox.yml';
    }
    console.log(chalk.blueBright('Running ansible script...'));
    result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} /bakerx/${inventory}`, 'vagrant@192.168.33.20');
    if( result.error ) { process.exit( result.status ); }
}
