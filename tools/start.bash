#!/bin/bash

trap killProcessGroup SIGINT

killProcessGroup(){
  kill 0
}

gulp &
rm -rf dist/${1}/dev && parcel serve --cache-dir=.parcel-cache/${1}/dev --dist-dir=dist/${1}/dev src/${1}/index.html &
wait