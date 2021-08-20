#!/bin/bash

# Trace commands as we run them:
set -x

# Install npm and node
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install nodejs -y

# Install dependencies
cd ~/checkbox.io-micro-preview
npm install
sudo npm install forever -g

# Stop all processes running via forever and start checkbox.io preview microservice
forever stopall
forever start index.js