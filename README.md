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

### Automatically configure a build environment for checkbox.io (thwinter)

### Create a build job for Jenkins (sawalter)

### Define build command for running Jenkins job (sawalter)