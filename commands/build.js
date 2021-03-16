const child = require('child_process');
const chalk = require('chalk');
const path = require('path');
const os = require('os');
const fs = require('fs');
const jenkins = require('jenkins')({ baseUrl: 'http://admin:admin@192.168.33.20:9000', crumbIssuer: true, promisify: true });

const scpSync = require('../lib/scp');
const sshSync = require('../lib/ssh');

exports.command = 'build [name]';
exports.desc = 'Create the Jenkins Build Job';
exports.builder = yargs => {
    yargs.options({
        u: {
            describe: 'The username for the jenkins server',
            type: 'string',
            default: 'admin'
        },
        p: {
            describe: 'The password for the jenkins server',
            type: 'string',
            default: 'admin'
        }
    });
};


exports.handler = async argv => {
    const { u, p, name } = argv;

    (async () => {

        await run( u, p, name );

    })();

};


// CODE ADAPTED FROM Jenkins Workshop to start build with npm
async function waitOnQueue(id) {
    return new Promise(function(resolve, reject)
    {
        jenkins.queue.item(id, function(err, item) {
            if (err) throw err;
            // console.log('queue', item);
            if (item.executable) {
                console.log('number:', item.executable.number);
                resolve(item.executable.number);
            } else if (item.cancelled) {
                console.log('cancelled');
                reject('canceled');
            } else {
                setTimeout(async function() {
                    resolve(await waitOnQueue(id));
                }, 5000);
            }
        });
    });
  }
  

async function triggerBuild(job) 
{
    let queueId = await jenkins.job.build(job);
    let buildId = await waitOnQueue(queueId);
    return buildId;
}

// This will stream the Jenkins log output to the console until it completes or fails
async function logBuildOutput(stream) {
    return new Promise((resolve, reject) => {
        stream.on('data', (data) => console.log(data));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve());
    })
}

async function startBuild(buildName)
{
    console.log('Triggering build.')
    let buildId = await triggerBuild(buildName).catch( e => console.log(e));

    console.log(`Received ${buildId}`);

    console.log(`Build output`);
    logBuildOutput(jenkins.build.logStream({name: buildName, number: buildId}));
}
// END CODE FROM JENKINS WORKSHOP

async function run(u, p, name) {
    
    if( name == null ) { console.log("You must specify a build name Run \"pipeline build --help\" for more information."); process.exit( 1 ); }
    
    console.log(chalk.blueBright(`Starting ${name} Build Job...`));
    await startBuild(name);

    //console.log(`Args: ${name}`);
}
