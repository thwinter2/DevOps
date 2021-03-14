#!/bin/bash

# Exit on error
set -e

# Trace commands as we run them:
set -x

# Script used to create jenkins job.
CRUMB=$(curl -s --cookie-jar /tmp/cookies -u admin:admin http://localhost:9000/crumbIssuer/api/json | grep -Po '"'"crumb"'"\s*:\s*"\K([^"]*)')

JENKINS_API_TOKEN=$(curl -X POST -H "Jenkins-Crumb:$CRUMB" --cookie /tmp/cookies http://localhost:9000/me/descriptorByName/jenkins.security.ApiTokenProperty/generateNewToken?newTokenName=\jenkins-api-token -u admin:admin | grep -Po '"'"tokenValue"'"\s*:\s*"\K([^"]*)')

jenkins-jobs --conf /bakerx/cm/jenkins_jobs.ini --user admin --password $JENKINS_API_TOKEN update /bakerx/cm/roles/jenkins/tasks/create-build-job-checkpoint-io.yml
