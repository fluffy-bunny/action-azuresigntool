#!/bin/bash

counter=0
while read -r line; do
  (( counter+=1 ))
  echo "$counter: $line"
done < <(git diff --name-only)
echo $counter

if [[ $counter -gt 0 ]]; then
  echo "Committing $counter files"
  exit 0
fi

echo "nothing being committed"
exit 1
