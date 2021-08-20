const path = require('path');
const fs   = require('fs');
const os   = require('os');

const child_process = require('child_process');

exports.command = 'ssh';
exports.desc = 'SSH into the VM';

exports.handler = async argv => {
    
    (async () => {
    
        await ssh();

    })();

};

async function ssh()
{ 
    let name = `V`;
    let identifyFile = path.join(os.homedir(), '.bakerx', 'insecure_private_key');
    let sshExe = `ssh -q -i "${identifyFile}" -p 2800 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null vagrant@127.0.0.1 `;
    child_process.execSync(`${sshExe}`, {stdio: ['inherit', 'inherit', 'inherit']})
}