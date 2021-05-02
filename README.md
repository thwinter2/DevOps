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

## Provision cloud instances (sawalter)

## Deploy checkbox.io and iTrust (thwinter)

## Canary analysis (anmcgill)

The canary command is implemented in a [canary.js](commands/canary.js) file in this project. The command provisions three VMs, one for the blue deployment, one for the green deployment, and one for the proxy deployment. The command assumes that the first argument represents the branch to clone on the blue deployment, and the second argument represents the branch to clone on the green deployment. For example, the command `pipeline canary master broken` will result in the master branch of the preview microservice repo getting cloned on the blue deployment and the broken branch getting cloned on the green deployment. Shell scripts are used to install dependencies, start the preview microservice, and configure and start Redis. The siege command line tool is installed on the proxy server. An [index.js](agent/index.js) file is copied to the green and blue VMs and run to publish CPU and memory usage metrics to the Redis instance running on the proxy server. We use forever for launching the agent and preview microservice processes on the green and blue VMs.

Once the VMs are configured, a [proxy.js](lib/proxy.js) file is run on the proxy VM. This script sets up the proxy server, uses Redis to subscribe to the metrics published by the agents on the blue and green VMs, and runs the siege tool on the proxy VM to direct traffic to the blue and green VMs. The script also calls the proxy endpoint to generate metrics related to calling the API. The siege tool is running for a minute on the blue VM. After this, the target deployment for the proxy is switched to the green VM and the siege tool is run against the green VM for a minute. Once this is complete, a canary report is generated using the metrics we've collected.

We selected five metrics for our canary analysis:

1. Memory usage
2. CPU usage
3. Latency
4. Number of failed requests (based on status code)
5. Size of responses from /preview endpoint

For the fourth metric, we keep track of a list of numbers. These numbers can be either 0 or 1, where 0 represents a successful request (a 200 status code) and a 1 represents an unsuccessful request (a non-200 status code).

We use the gist provided in the assignment, which is in a [mannwhitneyu.js](lib/mannwhitneyu.js) file, to perform Mann-Whitney U analysis on each metric. We run one-sided analysis twice on each metric so we can determine if the metric is too high or too low. To determine if the metrics are significantly different for the two VMs, we check the p-value returned by the two rounds of Mann-Whitney U analysis. We consider a metric "failed" if it is significantly lower or greater for the green deployment. The canary score we calculate is: `Number of passed metrics / Total number of metrics.`

We consider the canary failed if the canary score is less than 40%, indicating that at least four of our five metrics failed.

Here is an example report from running `pipeline canary master master`:
```
==============================================================================================
CANARY REPORT:

MEMORY LOAD: HIGH
CPU LOAD: PASS
LATENCY: PASS
FAILED REQUESTS: PASS
RESPONSE SIZES: PASS

FINAL CANARY SCORE = (4 / 5) = 80%
CANARY PASSED!
==============================================================================================
```

And here is an example report from running `pipeline canary master broken`:
```
==============================================================================================
CANARY REPORT:

MEMORY LOAD: LOW
CPU LOAD: LOW
LATENCY: LOW
FAILED REQUESTS: HIGH
RESPONSE SIZES: LOW

FINAL CANARY SCORE = (0 / 5) = 0%
CANARY FAILED!
==============================================================================================
```

### Challenges

We ran into socket errors when running siege on the green VM. To work around this, we decided to reduce the number of concurrent clients to five by setting -c5 when calling siege. We're also setting the delay for seige to one second by specifying a -d1 argument.

We've found that our memory usage, CPU usage, and latency metrics are not completely reliable. Our canary analysis will sometimes identify these metrics as significantly different for the two VMs even when they're both running from the master branch. We looked into tweaking the metrics, but did not have much success. For example, the systemInformation module allows you to retrieve the CPU and memory usage for individual processes rather than the system, and we tried just looking at the metrics for node processes running on the VMs, but we still encountered the same intermittent issues. Given more time, we could make these metrics more robust and define a stricter threshold for failing the canary build.