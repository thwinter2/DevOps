
const jenkins = require('jenkins')({ baseUrl: 'http://admin:admin@192.168.33.20:9000', crumbIssuer: true, promisify: true });

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

async function main()
{

    console.log('Triggering build.')
    let buildId = await triggerBuild('checkio-build-job').catch( e => console.log(e));

    console.log(`Received ${buildId}`);
    let build = await getBuildStatus('checkio-build-job', buildId);
    console.log( `Build result: ${build.result}` );

    console.log(`Build output`);
    let output = await jenkins.build.log({name: 'checkio-build-job', number: buildId});
    console.log( output );

}

(async () => {

    await main();

})()
