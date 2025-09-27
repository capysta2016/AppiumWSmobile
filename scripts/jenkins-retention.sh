#!/usr/bin/env bash
# jenkins-retention.sh
# Suggested retention helper for Jenkins: remove old workspaces and build artifacts
# Run as root or jenkins user (adjust paths accordingly)

set -euo pipefail

JENKINS_HOME=${JENKINS_HOME:-/var/lib/jenkins}
DAYS_TO_KEEP=${DAYS_TO_KEEP:-14}

echo "Cleaning Jenkins workspaces older than ${DAYS_TO_KEEP} days in ${JENKINS_HOME}"

# remove old workspace contents
find "${JENKINS_HOME}/workspace" -mindepth 1 -maxdepth 2 -type d -mtime +${DAYS_TO_KEEP} -print -exec rm -rf {} + 2>/dev/null || true

# remove old builds (careful)</>
# It's safer to use Jenkins UI or crumbed API to remove builds; here's a conservative approach:
find "${JENKINS_HOME}/jobs" -type d -name "builds" -prune -exec sh -c '
  for jobdir in "$@"; do
    find "$jobdir" -maxdepth 1 -type d -mtime +${DAYS_TO_KEEP} -print -exec rm -rf {} +
  done
' sh {} + 2>/dev/null || true

# compress old archived artifacts (optional)
# find "${JENKINS_HOME}" -type f -name "*.log" -mtime +${DAYS_TO_KEEP} -exec gzip -9 {} \; || true

echo "Jenkins retention cleanup finished."
