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
    
}