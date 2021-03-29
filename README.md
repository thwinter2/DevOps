# CSC 519 Project

## Milestone 1
For information about Milestone 1, see our [README](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/blob/M1/README.md) for that milestone.

## Milestone 2
Issue board for this milestone: https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/projects/2

[March 29th checkpoint report](CHECKPOINT.md)

### Screencast

TODO

### Instructions for running the code

1. Clone the git repository locally.
2. In the project directory, run `npm install`
3. In the project directory, run `npm link`
4. Create a file in the project directory named ".vault-pass".  Inside the file, store the password for the ansible vault.
5. In the project directory, run the command `pipeline setup`.
6. In the project directory, run the command `pipeline build checkbox.io`.  Optionally, you may specify a username and password for Jenkins with the command `pipeline build checkbox.io -u <jenkins-user-id> -p <jenkins-password>`