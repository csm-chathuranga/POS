@echo off
cd /d E:\LMUC-new\POS\attendance-sync-agent
node sync.js --loop >> sync.log 2>&1
