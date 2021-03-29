const chalk = require('chalk');
const sshSync = require('../lib/ssh');

exports.command = 'useful-tests';
exports.desc = 'Perform mutation testing to identify useful tests';
exports.builder = yargs => {
    yargs.options({
        c: {
            describe: 'Number of iterations',
            type: 'number'
        },
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
    const { c, user, pass } = argv;

    (async () => {

        await run( c, user, pass );

    })();

};

function run(iterations, user, pass)
{    
    console.log(chalk.green(`Performing mutation testing with ${iterations} iterations...`));

    // Clone the repo for iTrust
    console.log(chalk.blueBright(`Cloning iTrust repository from GitHub.`));
    sshSync(`git clone https://${user}:${pass}@github.ncsu.edu/engr-csc326-staff/iTrust2-v8`, 'vagrant@192.168.33.20');

    // Run script to perform mutation testing
    console.log(chalk.blueBright(`Running ${iterations} rounds of mutation testing...`));
    sshSync(`node /bakerx/lib/driver.js ${iterations}`, 'vagrant@192.168.33.20');

    // Remove repo after tests are completed
    console.log(chalk.blueBright(`Removing iTrust repo...`));
    sshSync('rm -f -r /home/vagrant/iTrust2-v8', 'vagrant@192.168.33.20');
}