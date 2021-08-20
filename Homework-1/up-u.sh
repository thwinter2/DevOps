
#!/bin/bash

# Create VM
bakerx run ubuntu-vm focal

# Get ssh command
ssh_cmd=$(bakerx ssh-info ubuntu-vm|tr -d '"')

# Use heredoc to send script over ssh
$ssh_cmd << 'END_DOC'

# Install packages
sudo apt-get --assume-yes update
sudo apt-get install nodejs git -y
# Get project
git clone https://github.com/CSC-DevOps/App
# Setup project
cd App
sudo apt install npm -y
npm install express
npm install fs

exit
END_DOC

VBoxManage controlvm ubuntu-vm natpf1 nodeport,tcp,,8089,,9000

echo $ssh_cmd
