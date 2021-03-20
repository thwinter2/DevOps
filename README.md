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

We used Ansible to automatically configure the build environment for the checkbox.io application. The Ansible logic is stored in the the ["Environment" Role](cm/roles/environment/tasks/main.yml) folder. The tasks are to setup and install the necessary software and environment variables; the handler is used to run the MongoDB once it has been installed.

The environment is automatically built when running the command "pipeline setup". The [playbook](cm/playbook.yml) contains the environment role, which prompts the tasks to run when the setup command is run. The checkbox.io application requires MongoDB, Node.js, and various environment variables to be declared. 

The general way to install Node and MongoDB using Ansible is to retrieve the public installation key, add the repository, then install the package. 

We were also tasked with automatically creating a MongoDB user. We utilized the community version of MongoDB in order to achieve this, which is also why we installed the mongo-org version of MongoDB. To use the mongodb_user command in Ansible, the python package pymongo had to be installed. We simply added that installation step as an Ansible task.

The environment variables were stored in the VM's /etc/environment file. We designated that path using Ansible and sent the various variables as a collection of keys. Each key is the variable name being initialized with its value. The password for the MongoDB user is obscured for security reasons by utilizing the .vault-pass file, which we could directly call as the value of the MONGO_PASSWORD environment variable.

### Create a build job for Jenkins (sawalter)

In order to create a Jenkins build job for the checkbox.io app, we first created an additional [Ansible role for the build tasks](/cm/roles/build/tasks/main.yml).  In this role, we install Jenkins Job Builder (JJB), which we utilized to create the build job.  We then ensure that MongoDB is running, as it is a prerequisite for the checkbox.io app.  Finally, we install the pm2 add, which is utilized by the build to keep the checkbox app running.

We then created a pipeline style [JJB job definition file](/cm/build-scripts/jjb-jobs/checkbox.io.yml) to define the steps in building the checkbox.io build job.  This includes a Source stage that clones the git repository into the jenkins workspace, followed by a Build stage that installs the node app and starts the app’s server using pm2.  Finally, a Test stage is run that initiates the Mocha tests included with the app.

In order to create the job in Jenkins, we modified the [pipeline setup command](/cm/commands/setup.js) to have it run a [script](/cm/build-scripts/checkbox.io.sh) to run the JJB job we had previously defined.  The script utilizes curl to obtain a CSFR crumb, and ultimately an API key for jenkins, which it then uses for authentication when creating the job.

#### Challenges

The biggest challenge we faced during this portion was figuring out how to authenticate with Jenkins.  The software versions we used did not seem to allow authentication with the plain text password for Jenkins, but instead required the use of an API key.  This was easy to generate manually in the Jenkins web interface, but generating and obtaining it programmatically proved much more challenging.  The Jenkins API does not provide an endpoint for retrieving the API token.  After researching several articles and message boards, we were eventually able to determine how to generate and obtain the key using curl.

### Define build command for running Jenkins job (sawalter)

In order to run the checkbox.io build job, we created a new pipeline command, [build](/cm/commands/build.js).  First, we used yargs to define and parse the command line options.  These include a required argument to specify the name of the job to build, followed by optional parameters for a jenkins username and password, which include default values when not specified.  We then modified the code from the Jenkins workshop for running a build job in jenkins.
