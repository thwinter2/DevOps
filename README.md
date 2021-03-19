# CSC 519 Project

## Milestone 1
Issue board for this milestone: https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/projects/1

[March 9th checkpoint report](CHECKPOINT.md)

### Screencast

Here is a link to the screencast demonstrating our implementation for this milestone: TODO

### Automatically configure a Jenkins server (anmcgill)

We're following this documentation in order to install Jenkins:
https://www.jenkins.io/doc/book/installing/linux/#debianubuntu

The logic for configuring our Jenkins server is in a ["jenkins" role](cm/roles/jenkins/tasks/main.yml) in ansible.

To disable Jenkins setup wizard, we update the JAVA_ARGS property in the Jenkins configuration file. We also update the HTTP_PORT option within that same file to get Jenkins running on port 9000. We then copy a Groovy script to the server using a template in ansible to configure the admin user. This script is taken from an example provided in the Jenkins workshop.

Once this configuration is completed, we restart Jenkins and install the necessary plugins. For restarting Jenkins and waiting for it to start up, we're using handlers in ansible, which we manually trigger in a few places to force restarts.

As part of implementing this piece of the build stage, we also added logic to copy in the .vault-pass file. Note that we made this file a requirement -- it must exist at the root of the project when "pipeline setup" is executed -- because we're using it to encrypt passwords within our ansible configuration files. We encrypt the passwords for the mongodb user and for the Jenkins admin. Since the admin for Jenkins is initially configured via a Groovy script, we use ansible to write the admin password to the /etc/environment file on the VM and retrieve the password using System.getenv() within the [Groovy script](groovy-security-script); this allows us to avoid hardcoding the password within our configuration files.

#### Challenges

One of the challenges we encountered as part of implementing this phase of the build was determining which plugins to install. We initially attempted to install and use build-pipeline-plugin for building pipeline-style jobs, but we eventually discovered through some trial and error that the workflow-aggregator plugin was the one we needed to be using.

The other issue we encountered was that Jenkins could take a while to start up on our machines, even though we were defining a task to wait on it. To work around this, we increased the initial delay in our polling task.

Another issue we faced was the formatting of the shell scripts. We were working on different host operating systems, so the shell scripts were not running properly being formatted as dos, so we created a [.gitattributes](.gitattributes) file to enforce the unix format on the host OS. 

### Automatically configure a build environment for checkbox.io (thwinter)

We used Ansible to automatically configure the build environment for the checkbox.io application. The Ansible logic is stored in the the ["Environment" Role](cm/roles/environment/tasks/main.yml) folder. The tasks are to setup and and install the necessary software and environment variables; the handler is used to run the MongoDB once it has been installed.

The environment is automatically built when running the command "pipeline setup". The [playbook](cm/playbook.yml) contains the environment role, which prompts the tasks to run when the setup command is run. The checkbox.io application requires MongoDB, Node.js, and various environment variables to be declared. 

The general way to install Node and MongoDB using Ansible is to retrieve the public installation key, add the repository, then install the package. 

We were also tasked with automatically creating a MongoDB user. We utilized the community version of MongoDB in order to achieve this, which is also why we installed the mongo-org version of MongoDB. To use the mongodb_user command in Ansible, the python package pymongo had to be installed. We simply added that installation step as an Ansible task.

The environment variables were stored in the VM's /etc/environment file. We designated that path using Ansible and sent the various variables as a collection of keys. Each key is the variable name being initialized with its value. The password for the MongoDB user is obscured for security reasons by utilizing the .vault-pass file, which we could directly call as the value of the MONGO_PASSWORD environment variable.

### Create a build job for Jenkins (sawalter)

### Define build command for running Jenkins job (sawalter)