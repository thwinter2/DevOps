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
        privateKey: {
            describe: 'Install the provided private key on the configuration server',
            type: 'string'
        }
    });
};


exports.handler = async argv => {
    const { privateKey } = argv;

    (async () => {

        await run( privateKey );

    })();

};

async function run(privateKey) {

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
        console.log(chalk.blueBright('A .vault-pass file does not exist, so copying the file will be skipped.'));
    }

    // Transforming path of the files in host to the path in VM's shared folder
    let filePath = '/bakerx/cm/playbook.yml';
    let inventoryPath = '/bakerx/cm/inventory.ini';

    console.log(chalk.blueBright('Running ansible script...'));
    result = sshSync(`/bakerx/cm/run-ansible.sh ${filePath} ${inventoryPath}`, 'vagrant@192.168.33.20');
    if( result.error ) { process.exit( result.status ); }
}
