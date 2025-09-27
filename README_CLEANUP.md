Cleanup & Reliability for Jenkins + Docker (short guide)

What I changed

- Preflight stage in `Jenkinsfile` now runs only when `STAGE_COUNT == '0'` to allow an explicit preflight-only run.
- Added `scripts/cleanup-docker.sh` — interactive helper to prune Docker safely and truncate large logs.
- Added `scripts/jenkins-retention.sh` — conservative cleanup for old Jenkins workspaces/builds.

Quick usage

1. Run preflight-only build in Jenkins

   - In Jenkins: Build with Parameters -> set `STAGE_COUNT` to `0` and run.
   - The Preflight stage will run and fail early if free space < 30GB.

2. Run safe cleanup on the Jenkins host

   - SSH to Jenkins host and run:
     sudo bash scripts/cleanup-docker.sh
   - Follow prompts. This will run safe prunes and optionally an aggressive prune.

3. Configure periodic retention
   - To keep disk healthy, add a cron entry for weekly cleanup and daily small prune.

Example crontab (run as root or via system cron):

# daily light prune and journal vacuum

0 3 \* \* \* /usr/bin/docker container prune -f >/dev/null 2>&1; /usr/bin/docker image prune -f >/dev/null 2>&1; /usr/bin/journalctl --vacuum-time=7d >/dev/null 2>&1

# weekly aggressive cleanup + jenkins retention (Sunday 4:30)

30 4 \* \* 0 /bin/bash /home/jenkins/appium-js-tests/scripts/cleanup-docker.sh -y >/var/log/jenkins_cleanup.log 2>&1

# weekly Jenkins retention to delete old builds/workspaces

45 4 \* \* 0 /bin/bash /home/jenkins/appium-js-tests/scripts/jenkins-retention.sh >/var/log/jenkins_retention.log 2>&1

Notes & Safety

- The cleanup scripts are conservative and interactive by default. Review prompts before confirming.
- `cleanup-docker.sh` will truncate logs and prune unused resources. Aggressive prune removes all unused images and volumes — use with care.
- `jenkins-retention.sh` uses filesystem heuristics. Prefer configuring retention in Jenkins UI or using Jenkins API for complex cases.

Recommended next steps

- Increase VM disk to 40-60GB if you plan to run Android emulators regularly.
- Configure a monitoring alert for /var/lib/docker usage.
- Consider moving Docker root to a larger partition if expanding VM is not possible.
