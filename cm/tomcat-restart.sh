#!/bin/bash

# Exit on error
set -e

# Trace commands as we run them:
set -x

sudo systemctl restart tomcat
