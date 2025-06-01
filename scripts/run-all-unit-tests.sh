#!/bin/bash

# Find all projects with test targets, excluding e2e project
echo "Finding projects with test targets..."
PROJECTS_WITH_TESTS=$(npx nx show projects --with-target=test | grep -v "e2e" | tr '\n' ',' | sed 's/,$//')

# Check if we found any projects
if [ -z "$PROJECTS_WITH_TESTS" ]; then
  echo "No projects with test targets found!"
  exit 1
fi

echo "Running tests for projects: $PROJECTS_WITH_TESTS"

# Run tests for all projects that have test targets
npx nx run-many --target=test --projects=$PROJECTS_WITH_TESTS --detectOpenHandles $@