# CSC 519 Project

## Milestone 1
For information about Milestone 1, see our [README](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/blob/M1/README.md) for that milestone.

## Milestone 2
For information about Milestone 2, see our [README](https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/blob/M2/README.md) for that milestone.

## Milestone 3
Issue board for this milestone: https://github.ncsu.edu/cscdevops-spring2021/DEVOPS-28/projects/3

[April 26th checkpoint report](CHECKPOINT.md)

### Screencast

TODO

### Instructions for running the code

1. Clone the git repository locally.
2. In the project directory, run `npm install`
3. In the project directory, run `npm link`
4. Create a file in the project directory named ".vault-pass".  Inside the file, store the password for the ansible vault.
5. In the project directory, run the command `pipeline setup --gh-user <Your GitHub Account Name> --gh-pass <GitHub API Key>`.
6. In the project directory, run the command `pipeline build iTrust -u <jenkins-user-id> -p <jenkins-password>`
7. In the project directory, run the command `pipeline useful-tests -c 1000 --gh-user <Your GitHub Account Name> --gh-pass <GitHub API Key>`
8. In the project directory, run the command `pipeline build checkbox.io`.  Optionally, you may specify a username and password for Jenkins with the command `pipeline build checkbox.io -u <jenkins-user-id> -p <jenkins-password>`

