#!/bin/bash

# Define an array with two file names
files=("./france.txt" "./france.cub")


# Delete old files
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Get the file name without the directory path
    filename=$(basename "$file")
   
    # Delete existing files with the same suffix before the "_" character
    suffix="${filename%.*}"
    rm -f ${suffix}_*

  else
    echo "Delete old files: File not found: $file"
  fi
done

# Get the current date and time in yyyy_mm_dd_hh format
# Extract the first line of the file
first_line=$(head -n 1 france.txt)
# Retrieve the 3rd string separated by a space
date_version=$(echo $first_line | awk '{print $3}')
# Replace the ':' character with '-'
date_version=$(echo $date_version | sed 's/:/-/g')
# Delete everything after, and including the '+' character
date_version=$(echo $date_version | sed 's/\+.*//')

# Loop through all provided files
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Get the file name without the directory path
    filename=$(basename "$file")
    # Create the new file name
    new_filename="${filename%.*}_$date_version.${filename##*.}"
    # Copy the file and rename it
    cp "$file" "$new_filename"
    echo "Copied and renamed $file to $new_filename"
  else
    echo "File not found: $file"
  fi
done