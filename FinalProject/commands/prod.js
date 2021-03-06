const keygen = require("ssh-keygen");
const chalk = require('chalk');
const got    = require("got");
const fs = require('fs');
const child = require('child_process');


exports.command = 'prod [command]';
exports.desc = 'Provision cloud servers iTrust, checkbox.io, and Monitor';

exports.handler = async argv => {
    const { command } = argv;

    await run(command);

};

var config = {};
// Retrieve our api token from the environment variables.
config.token = process.env.NCSU_DOTOKEN;
var dropletID;
var ips = []; 
var sshID;
var savedDroplet;

const delay = ms => new Promise(res => setTimeout(res, ms));

const headers =
{
	'Content-Type':'application/json',
	Authorization: 'Bearer ' + config.token
};

const sleep = async ms => {
    return new Promise(f => {
        setTimeout(f, ms);
    });
};

//Works in linux but not on windows machines
// const generateKeys = async () => {
//     return new Promise((fulfill, reject) => {
//         // This is where we'll store the public and private keys
//         const path = process.cwd() + "/.ssh/";
//         const location = path + "digitalocean_rsa";
//         const comment = "youremail@example.com";

//         // Make sure the .keys folder exists
//         if (!fs.existsSync(path)) {
//             fs.mkdirSync(path);
//         }

//         // Now generate the key
//         keygen(
//             {
//                 location: location,
//                 comment: comment,
//                 password: null, // No password as we're automating usage
//                 read: true
//             },
//             function(err, out) {
//                 if (err) {
//                     reject("Error creating SSH key: " + err);
//                     return;
//                 }

//                 fulfill({
//                     privateKey: out.key,
//                     publicKey: out.pubKey
//                 });
//             }
//         );
//     });
// };

const generateKeys = async () => {
    return new Promise((fulfill, reject) => {
        const comment = "youremail@example.com";
        const path = process.cwd() + "/.ssh/";
        const location = path + "digitalocean_rsa";
        const pubKeyLocation = `${location}.pub`;

        if (fs.existsSync(location)) {
            fs.unlinkSync(location);
        }

        if (fs.existsSync(pubKeyLocation)) {
            fs.unlinkSync(pubKeyLocation);
        }

        var keygen = child.spawn('ssh-keygen', [
            '-t', 'rsa',
            '-b', '2048',
            '-C', comment,
            '-N', '',
            '-f', location,
            '-m', 'RFC4716'
        ]);

        keygen.stdout.on('data', function(data) {
            console.log(`${data}`);
        });

        keygen.on('close', function() {
            fs.readFile(location, 'utf8', function(err, privateKey) {
                fs.readFile(pubKeyLocation, 'utf8', function(err, publicKey) {
                    fulfill({
                        privateKey: privateKey,
                        publicKey: publicKey
                    });
                })
            });
        });
    });
};


async function run(command) {
    if (command == "up") {
		try {
			const { privateKey, publicKey } = await generateKeys();
		
			console.log('Private Key:', privateKey);
			console.log('Public Key:', publicKey);

			await provision(publicKey);

		} catch (ex) {
			console.error(ex);
		}

        // await provision();
        //console.log(ips);
        //fs.writeFileSync('./inventory.ini', `[itrust]\n${ips[0]} ansible_ssh_private_key_file=~/.bakerx/insecure_private_key ansible_user=vagrant\n\n[checkbox]\n${ips[1]} ansible_ssh_private_key_file=~/.bakerx/insecure_private_key ansible_user=vagrant\n\n[monitor]\n${ips[2]} ansible_ssh_private_key_file=~/.bakerx/insecure_private_key ansible_user=vagrant\n`);
        fs.writeFile("./inventory.ini", `[itrust]\n${ips[0]} ansible_ssh_private_key_file=/home/vagrant/.ssh/digitalocean_rsa ansible_user=vagrant ansible_ssh_common_args='-o StrictHostKeyChecking=no'\n\n[checkbox]\n${ips[1]} ansible_ssh_private_key_file=/home/vagrant/.ssh/digitalocean_rsa ansible_user=vagrant ansible_ssh_common_args='-o StrictHostKeyChecking=no'\n\n[monitor]\n${ips[2]} ansible_ssh_private_key_file=/home/vagrant/.ssh/digitalocean_rsa ansible_user=vagrant ansible_ssh_common_args='-o StrictHostKeyChecking=no'\n`, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The inventory.ini file was saved!");
            // SHOULD WE COPY THE inventory.ini FILE TO THE CM SERVER HERE SO IT CAN BE USED IN LATER STEPS?
        }); 
    }
};

class DigitalOceanProvider
{

	async createDroplet (dropletName, region, imageName, keyID, publicKey, size )
	{
		if( dropletName == "" || region == "" || imageName == "" )
		{
			console.log( chalk.red("You must provide non-empty parameters for createDroplet!") );
			return;
		}

		var data = 
		{
			"name": dropletName,
			"region":region,
			"size":size,
			"image":imageName,
			"ssh_keys":[keyID],
			"backups":false,
			"ipv6":false,
			"user_data":`#cloud-config\n  users:\n  - name: vagrant\n    groups: sudo\n    shell: /bin/bash\n    sudo: ['ALL=(ALL) NOPASSWD:ALL']\n\n    ssh-authorized-keys:\n      - ${publicKey}`,
			"private_networking":null
		};

		console.log("Attempting to create: "+ JSON.stringify(data) );

		let response = await got.post("https://api.digitalocean.com/v2/droplets", 
		{
			headers:headers,
			json: data
		}).catch( err => 
			console.error(chalk.red(`createDroplet: ${err}`)) 
		);

		if( !response ) return;

		console.log(response.statusCode);
		console.log(response.body);

		let droplet = JSON.parse(response.body).droplet;

		if(response.statusCode == 202)
		{
            console.log(chalk.green(`Created droplet id ${droplet.id}`));
			dropletID = droplet.id;
			
			do {
				await sleep(5000);
				const result = await this.pollDroplet(dropletID);
				droplet = savedDroplet;
				console.log("Droplet status: " + droplet.status);
			} while (droplet.status === "new");
			
			if (droplet.status !== "active") {
				throw "Droplet had the status " + droplet.status;
			}
		}
	}

	async createKey (data) {
		let response = await got.post("https://api.digitalocean.com/v2/account/keys", 
		{
			headers:headers,
			json: data
		}).catch( err => 
			console.error(chalk.red(`createKey: ${err}`)) 
		);

		if( !response ) return;

		console.log(response.statusCode);
		console.log(response.body);

		let key = JSON.parse(response.body).ssh_key;

		if(response.statusCode == 201)
		{
            console.log(chalk.green(`Added ssh key ${key.id}`));
            sshID = key.id;
		}
	}

	async dropletInfo (id)
	{
		if( typeof id != "number" )
		{
			console.log( chalk.red("You must provide an integer id for your droplet!") );
			return;
		}

		// Make REST request
		let response = await got(`https://api.digitalocean.com/v2/droplets/${id}`, { headers: headers, responseType: 'json' })
		.catch(err => console.error(`dropletInfo ${err}`));

		if( !response ) return;

		if( response.body.droplet )
		{
			let droplet = response.body.droplet;
            ips.push(droplet.networks.v4[1].ip_address);

		}

	}

	async pollDroplet (id)
	{
		if( typeof id != "number" )
		{
			console.log( chalk.red("You must provide an integer id for your droplet!") );
			return;
		}

		// Make REST request
		let response = await got(`https://api.digitalocean.com/v2/droplets/${id}`, { headers: headers, responseType: 'json' })
		.catch(err => console.error(`dropletInfo ${err}`));

		if( !response ) return;

		if( response.body.droplet )
		{
			savedDroplet = response.body.droplet;
		}

	}

	async keyInfo()
	{
		// Make REST request
		let response = await got(`https://api.digitalocean.com/v2/account/keys`, { headers: headers, responseType: 'json' })
		.catch(err => console.error(`keyInfo ${err}`));

		if( !response ){
			console.log('Key Failed');
			return;	
		};

		if( response.body.ssh_keys)
		{
			for(let key of response.body.ssh_keys){
				if (key.name == 'my_ssh_key'){
					return key.id;
				}
			}
		}

	}
};

async function provision(publicKey)
{
		let client = new DigitalOceanProvider();


	// #############################################
	// Create an droplet with the specified name, region, and image
	var region = "nyc1"; // Fill one in from #1
	var image = "ubuntu-20-04-x64"; // Fill one in from #2
	//fs.writeFileSync('./cloud-config', `#cloud-config\n  users:\n  - name: vagrant\n    groups: sudo\n    shell: /bin/bash\n    sudo: ['ALL=(ALL) NOPASSWD:ALL']\n\n    ssh-authorized-keys:\n      - ${publicKey}`);


	// Save the public key in DigitalOcean and get the id of it
	const keyResult = await client.createKey({
		name: "test-key",
		public_key: publicKey
	});
	//const keyID = keyResult.ssh_key.id;

	console.log("Created key", sshID);
	
	await client.createDroplet("itrust", region, image, sshID, publicKey, "s-2vcpu-4gb");
    //await delay(5000);  // PAUSE 5 SECONDS TO ALLOW PROVISIONING TO OCCUR
    await client.dropletInfo(dropletID);
    await client.createDroplet("checkbox", region, image, sshID, publicKey, "s-1vcpu-1gb");
	//await delay(5000);
    await client.dropletInfo(dropletID);
    await client.createDroplet("monitor", region, image, sshID, publicKey, "s-1vcpu-1gb");
    //await delay(5000);
	await client.dropletInfo(dropletID);

}