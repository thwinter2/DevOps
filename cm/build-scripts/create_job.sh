#!/bin/bash

# Exit on error
set -e

# Trace commands as we run them:
set -x

# Script used to create jenkins job.
CRUMB=$(curl -s --cookie-jar /tmp/cookies -u admin:$JENKINS_ADMIN_PASSWORD http://localhost:9000/crumbIssuer/api/json | grep -Po '"'"crumb"'"\s*:\s*"\K([^"]*)')

GH_USER=$2
GH_PASS=$3

JENKINS_API_TOKEN=$(curl -X POST -H "Jenkins-Crumb:$CRUMB" --cookie /tmp/cookies http://localhost:9000/me/descriptorByName/jenkins.security.ApiTokenProperty/generateNewToken?newTokenName=\jenkins-api-token -u admin:$JENKINS_ADMIN_PASSWORD | grep -Po '"'"tokenValue"'"\s*:\s*"\K([^"]*)')

if [[ -n "$GH_USER" && -n "$GH_PASS" ]]; then
  request=$(jq -n \
  --arg gh_user "$GH_USER" \
  --arg gh_pass "$GH_PASS" \
  '{
      "": "0",
      "credentials": {
          "scope": "GLOBAL",
          "id": "gh-password",
          "username": "\($gh_user)",
          "password": "\($gh_pass)",
          "description": "gh-password",
          "$class": "com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl"
      }
  }')
  curl -H "Jenkins-Crumb:$CRUMB" --cookie /tmp/cookies -X POST --data-urlencode "json=$request" "http://admin:${JENKINS_API_TOKEN}@localhost:9000/credentials/store/system/domain/_/createCredentials"
fi

jenkins-jobs --conf /bakerx/cm/jenkins_jobs.ini --user admin --password $JENKINS_API_TOKEN update "/bakerx/cm/build-scripts/jjb-jobs/$1.yml"
