#!/bin/bash
set -e
echo "Starting Spey Ride frontend..."
yarn install --silent
echo "Opening http://localhost:3000"
yarn start
