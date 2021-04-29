#!/bin/bash

# Trace commands as we run them:
set -x

# Install npm and node
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install nodejs -y

# Install dependencies
cd ~/checkbox.io-micro-preview
npm install
npm install pm2

# Start service
npx pm2 stop index; npx pm2 start index.js