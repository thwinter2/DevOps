#!/bin/bash

# Exit on error
set -e

# Trace commands as we run them:
set -x

cd /usr/share/tomcat
sudo chgrp -R tomcat /usr/share/tomcat
sudo chmod -R g+r conf
sudo chmod g+x conf
sudo chown -R tomcat webapps/ work/ temp/ logs/

sudo systemctl daemon-reload
sudo systemctl start tomcat

sudo ufw allow 8080

sudo systemctl enable tomcat
