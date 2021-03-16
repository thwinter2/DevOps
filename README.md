# CSC 519 Project

## Milestone 1
Issue board for first milestone: https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/projects/1

[March 9th checkpoint report](CHECKPOINT.md)

Screencast: TODO

### Automatically configure a Jenkins server (anmcgill)

For this part of the build, we're following this documentation in order to install Jenkins:
https://www.jenkins.io/doc/book/installing/linux/#debianubuntu

To disable Jenkins setup wizard, we update the JAVA_ARGS property in the Jenkins configuration file. We also update the HTTP_PORT option within that same file to get Jenkins running on port 9000. We then copy a Groovy script to the server using a template in ansible to configure the admin user. This script is taken from an example provided in Discord:
https://discord.com/channels/776118414694940743/776801301823488001/816806781384130620

Once this configuration is completed, we restart Jenkins and install the necessary plugins. For restarting Jenkins and waiting for it to start up, we're using handlers in Jenkins, which we manually trigger in a few places to force restarts.

As part of implementing this piece of the build stage, we also added logic to copy in the .vault-pass file. Note that we made this file a requirement -- it must exist at the root of the project when "pipeline setup" is executed -- because we are using it to encrypt passwords within our ansible configuration files.

#### Challenges

One of the challenges we encountered as part of implementing this phase of the build was determining which plugins to install. We initially attempted to install and use build-pipeline-plugin for building pipeline-style jobs, but we eventually discovered through some trial and error that the workflow-aggregator plugin was the one needed to be using.

The other issue we encountered was that Jenkins could take a while to start up on our machines, even though we were defining a task to wait on it. To work around this, we increased the initial delay in our polling task.

### Automatically configure a build environment for checkbox.io (thwinter)

### Create a build job for Jenkins (sawalter)

### Define build command for running Jenkins job (sawalter)