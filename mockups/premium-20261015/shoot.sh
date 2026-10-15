#!/bin/bash
# usage: shoot.sh <name>   (page must already be where you want it; MockPrm loaded)
S=/mnt/c/Users/pete/Documents/MciPro/mockups/premium-20261015/shots
agent-browser eval "MockPrm.off()" >/dev/null; agent-browser wait 450
agent-browser screenshot $S/$1-classic.png >/dev/null
agent-browser eval "MockPrm.on()" >/dev/null; agent-browser wait 650
agent-browser screenshot $S/$1-premium.png >/dev/null
echo "$1 $(md5sum $S/$1-classic.png | cut -c1-6) $(md5sum $S/$1-premium.png | cut -c1-6)"
