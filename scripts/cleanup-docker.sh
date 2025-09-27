#!/usr/bin/env bash
# cleanup-docker.sh
# Safe Docker cleanup helper for Jenkins host
# - shows diagnostics
# - prunes safe Docker objects
# - truncates large container logs
# Run as root (or with sudo). Use interactively.

set -euo pipefail

echo "== Docker cleanup helper =="

# 1) show disk and docker summary
df -h /
echo
sudo docker system df || true

read -rp "Proceed with safe prune (container/image/volume prune)? [y/N]: " ans
if [[ "$ans" != "y" && "$ans" != "Y" ]]; then
  echo "Abort: user chose not to prune."
  exit 0
fi

# 2) prune stopped containers and dangling images/volumes
echo "Pruning stopped containers, dangling images and volumes..."
sudo docker container prune -f || true
sudo docker image prune -f || true
sudo docker volume prune -f || true

# 3) truncate large container logs (safe)
LOGS=$(sudo find /var/lib/docker/containers -type f -name '*-json.log' -size +100M -print 2>/dev/null || true)
if [[ -n "$LOGS" ]]; then
  echo "Found large log files; truncating..."
  while IFS= read -r f; do
    echo "Truncating $f"
    sudo truncate -s 0 "$f" || true
  done <<< "$LOGS"
else
  echo "No large container logs found (>100M)."
fi

# 4) final docker system prune (aggressive, optional)
read -rp "Run aggressive docker system prune -a --volumes? This will remove unused images (y/N): " ans2
if [[ "$ans2" == "y" || "$ans2" == "Y" ]]; then
  echo "Running aggressive prune..."
  sudo docker system prune -a -f --volumes || true
else
  echo "Skipping aggressive prune."
fi

# 5) summary
echo "=== Post-cleanup summary ==="
df -h /
sudo du -sh /var/lib/docker || true
sudo docker system df || true

echo "Done. Review the output above."
