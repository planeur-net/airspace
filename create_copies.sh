#!/bin/bash

echo "## Create copies with date"
          cd ./airspace

          # Define an array with two file names
          files=("./france.txt" "./france.cub" "./france_openair_standard.txt")

          # Delete old files
          for file in "${files[@]}"; do
            if [ -f "$file" ]; then
              # Get the file name without the directory path
              filename=$(basename "$file")
            
              # Delete existing files with the same suffix before the "#" character
              suffix="${filename%.*}"
              rm -f ${suffix}#*

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
              new_filename="${filename%.*}#$date_version.${filename##*.}"
              # Copy the file and rename it
              cp "$file" "$new_filename"
              echo "Copied and renamed $file to $new_filename"
            else
              echo "File not found: $file"
            fi
          done

          # Update the README.md file
          readme_file="README.md"
          if [ -f "$readme_file" ]; then
            for file in "${files[@]}"; do
              # Print the file name
              echo "Update Readme.md: Processing $file"
              filename=$(basename "$file")
              suffix="${filename%.*}"
              
              # In  all strings containing suffix between, and not including "(" and the next ")", replace the portion between "#" and "." with the date version
              sed -i "s/\($suffix[^()]*#\)[^\.]*/\1$date_version/g" README.md
              # In  all strings containing suffix between, and not including "[" and the next "]", replace the portion between "#" and "." with the date version
              sed -i "s/\($suffix[^][]*#\)[^\.]*/\1$date_version/g" README.md
              
              
            done
            echo "Updated $readme_file with new date version."
          else
            echo "README.md file not found!"
          fi

       