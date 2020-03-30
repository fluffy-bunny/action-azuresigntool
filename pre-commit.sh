#!/bin/bash
 
counter=0
git diff --name-only | while read FILE; do
((counter++))
done 

if [ "$counter" -eq "0" ]; then
    echo "nothing being commited"
    exit 1
else
    echo `commiting $counter files`
fi

