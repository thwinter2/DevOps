#!/bin/bash

# Trace commands as we run them:
set -x

# Install npm and node
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install nodejs -y

# Install dependencies
cd ~/checkbox.io-micro-preview
npm install
sudo npm install -g pm2

# Start service
pm2 stop index; pm2 start index.js