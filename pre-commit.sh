#!/bin/bash

counter=0
FILES=$(git diff --name-only)
for FILE in $FILES
do
    counter=$(( $counter + 1 ))
    echo "$counter:$FILE"
done
echo $counter

if [ $counter -gt 0 ]
then
    echo "commiting $counter files"
    exit 0
fi


echo "nothing being commited"
exit 1