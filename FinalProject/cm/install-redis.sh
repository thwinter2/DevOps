#!/bin/bash

sudo apt-get update
sudo apt-get -y install redis-server
sudo sed -i 's/supervised no/supervised systemd/g' /etc/redis/redis.conf
sudo sed -i 's/bind 127.0.0.1 ::1/bind 0.0.0.0/g' /etc/redis/redis.conf
sudo systemctl restart redis