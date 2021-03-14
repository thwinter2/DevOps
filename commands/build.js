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
            type: 'string'
        },
        p: {
            describe: 'The password for the jenkins server',
            type: 'string'
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
async function getBuildStatus(job, id) {
    return new Promise(async function(resolve, reject)
    {
        console.log(`Fetching ${job}: ${id}`);
        let result = await jenkins.build.get(job, id);
        resolve(result);
    });
}

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

async function startBuild(buildName)
{

    console.log('Triggering build.')
    let buildId = await triggerBuild(buildName).catch( e => console.log(e));

    console.log(`Received ${buildId}`);
    let build = await getBuildStatus(buildName, buildId);
    console.log( `Build result: ${build.result}` );

    console.log(`Build output`);
    let output = await jenkins.build.log({name: buildName, number: buildId});
    console.log( output );

}
// END CODE FROM JENKINS WORKSHOP

async function run(u, p, name) {
    
    if( u == null || p == null || name == null ) { console.log("You must specify a build name and Jenkins username and password.  Run \"pipeline build --help\" for more information."); process.exit( 1 ); }
    
    console.log(chalk.greenBright(`Building ${name} job with JJB!`));

    console.log(chalk.blueBright(`Creating Jenkins Job for ${name}...`));
    result = sshSync(`/bakerx/cm/build-scripts/${name}.sh ${name} ${u} ${p}`, 'vagrant@192.168.33.20');
    if( result.error ) { console.log(result.error); process.exit( result.status ); }
    
    console.log(chalk.blueBright(`Starting ${name} Build Job...`));
    await startBuild(name);

    //console.log(`Args: ${name}`);
}
