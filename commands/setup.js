const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const fs = require('fs');

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = 'setup';
exports.desc = 'Provision and configure the configuration server';
exports.builder = yargs => {
    yargs.options({
        'gh-user': {
            describe: 'The username that will be used when cloning iTrust from Github',
            type: 'string',
            alias: 'user'
        },
        'gh-pass': {
            describe: 'The password that will be used when cloning iTrust from Github',
            type: 'string',
            alias: 'pass'
        }
    });
};

exports.handler = async argv => {

    (async () => {

        await run();

    })();

};

async function run() {

    console.log(chalk.greenBright('Installing configuration server!'));

    console.log(chalk.blueBright('Provisioning configuration server...'));
    let result = child.spawnSync(`bakerx`, `run config-srv focal --memory 2048 --ip 192.168.33.20 --sync`.split(' '), {shell:true, stdio: 'inherit'} );
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    console.log(chalk.blueBright('Running init script...'));
    result = sshSync('/bakerx/cm/server-init.sh', 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }

    // Copy .vault-pass file, if it exists
    if (fs.existsSync('.vault-pass')) {
        console.log(chalk.blueBright('A .vault-pass file exists. Copying the file to the home directory of the VM...'));
        result = scpSync('.vault-pass', 'vagrant@192.168.33.20:')
        if( result.error ) { console.log(result.error); process.exit( result.status ); }
    } else {
        console.log("You must have a .vault-pass file at the root of your project with the ansible vault password."); process.exit( 1 );
    }

    // Transforming path of the files in host to the path in VM's shared folder
    let filePath = '/bakerx/cm/playbook.yml';
    let inventoryPath = '/bakerx/cm/inventory.ini';

    console.log(chalk.blueBright('Running ansible script...'));
    result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} ${inventoryPath}`, 'vagrant@192.168.33.20');
    if( result.error ) { process.exit( result.status ); }
    
    console.log(chalk.greenBright(`Building checkbox.io job with JJB!`));

    console.log(chalk.blueBright(`Creating Jenkins Job for checkbox.io...`));
    result = sshSync(`/bakerx/cm/build-scripts/checkbox.io.sh checkbox.io`, 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
}
