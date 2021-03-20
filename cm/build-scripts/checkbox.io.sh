#!/bin/bash

# Exit on error
set -e

# Trace commands as we run them:
set -x

# Script used to create jenkins job.
CRUMB=$(curl -s --cookie-jar /tmp/cookies -u admin:$JENKINS_ADMIN_PASSWORD http://localhost:9000/crumbIssuer/api/json | grep -Po '"'"crumb"'"\s*:\s*"\K([^"]*)')

JENKINS_API_TOKEN=$(curl -X POST -H "Jenkins-Crumb:$CRUMB" --cookie /tmp/cookies http://localhost:9000/me/descriptorByName/jenkins.security.ApiTokenProperty/generateNewToken?newTokenName=\jenkins-api-token -u admin:$JENKINS_ADMIN_PASSWORD | grep -Po '"'"tokenValue"'"\s*:\s*"\K([^"]*)')

jenkins-jobs --conf /bakerx/cm/jenkins_jobs.ini --user $2 --password $JENKINS_API_TOKEN update "/bakerx/cm/build-scripts/jjb-jobs/$1.yml"
