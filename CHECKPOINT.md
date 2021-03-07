# Checkpoint

## Automatically configure a Jenkins server (anmcgill)

For this task, we've defined a role in ansible for installing Jenkins and its dependencies. We haven't yet configured Jenkins, so it isn't running on the correct port, and the admin user is not being initiallized, but we were able to verify that the Jenkins instance could be accessed from a browser after running "pipeline setup":
![Jenkins Installed](screenshots/jenkinsInstalled.PNG)

The code for this is currently on a separate branch: https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/tree/configureJenkinsServer

The implementation in ansible attempts to follow the Jenkins documentation for installing from the command line on Debian/Ubuntu Linux distributions: https://www.jenkins.io/doc/book/installing/linux/#debianubuntu

There are two remaining issues to be implemented as part of this task:

1. Configure Jenkins and copy in the .vault-pass file: https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/issues/4
2. Install jenkins-plugins: https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/issues/5

## Automatically configure a build environment for checkbox.io

## Create a build job for Jenkins