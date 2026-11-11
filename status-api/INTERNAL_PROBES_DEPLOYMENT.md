# Internal service probe deployment

## Problem and change
The scheduled collector probes three public hostnames that are about to move behind Cloudflare Access. Resolve only those three SERVICE_CHECKS targets from deployment environment variables, with no public fallback. Keep every node ID, display name, the existing HTTP status policy (<500 is up), and status.json result fields unchanged.

Missing or invalid configuration reports the existing down result without making a request. The resolver rejects TechFusion public hostnames, URL credentials, query strings, fragments, malformed URLs, and unsupported schemes. Actual internal addresses belong only in the untracked deployment .env; .env.example contains empty variable names.

## Verified target sources
| Old target | New target | Target evidence |
|---|---|---|
| https://uptime.techfusionreport.com | $UPTIME_KUMA_INTERNAL_URL | http://[INTERNAL-HOST-REDACTED]:3001 |
| https://sync.techfusionreport.com | $SYNCTHING_INTERNAL_URL | http://127.0.0.1:8384 — verified by Justin: Oracle Docker container `syncthing`, web UI port 8384; collector cron runs on the same host |
| https://glances-hetzner.techfusionreport.com | $GLANCES_HETZNER_INTERNAL_URL | http://[INTERNAL-HOST-REDACTED]:61208 |

Draft retained for review; no merge or deployment authorized. Syncthing is verified on Oracle at http://127.0.0.1:8384. It has no Sync ingress entry and must not be looked up in ingress. The deployment commands below keep the existing Uptime Kuma and Glances (Hetzner) ingress lookups unchanged, stop if either mapping is absent, and set Syncthing directly to its verified loopback target. They never display the config or private address values.

## Validation
- Rerun for the verified Syncthing target: 7/7 unit tests passed; the resolver also accepted http://127.0.0.1:8384 in a separate offline assertion. No collector, helper, or test changes were needed.
- python3 -B -m unittest discover -s status-api -p 'test_*.py' -v: 7 tests passed, including the existing observability tests.
- Tests cover configured targets, all three identities, missing settings, rejection of public/malformed settings, no request on a missing target, unchanged HTTP status policy, unchanged output fields, and no target URLs in the service result.
- AST comparison against main confirmed that only the three requested table targets changed and all other targets and identities were preserved.
- git diff --cached --check passed. The update contains only the explicitly permitted 127.0.0.1 loopback address; no other IP literals, secrets, or webhook URLs were added.
- No live target reachability test or deployment was performed. Existing historical address literals elsewhere in the repository are outside this diff.

## Exact manual deployment steps for /opt
Run only after merge to main and explicit deployment authorization. Run on Oracle as the same user that owns the deployed collector and its cron job. These steps do not edit /etc or crontabs. If the clean-file check fails, stop and reconcile deployed local collector edits before continuing; do not reset or overwrite them.

```bash
set -euo pipefail
umask 077
work=$(mktemp -d /tmp/tfr-probes-deploy.XXXXXX)
trap 'rm -rf "$work"' EXIT
deploy=/opt/tfr-command-center/status-api
gh repo clone TechFusionReport/tfr-command-center "$work/source" -- --branch main --single-branch
python3 -B -m unittest discover -s "$work/source/status-api" -p 'test_*.py' -v
git -C /opt/tfr-command-center diff --quiet HEAD -- status-api/collect.py status-api/internal_targets.py || {
  echo 'STOP: reconcile deployed collector edits first.'
  exit 1
}
test -f "$deploy/.env"
test ! -e "$deploy/internal_targets.py" || git -C /opt/tfr-command-center ls-files --error-unmatch status-api/internal_targets.py >/dev/null
cp "$deploy/.env" "$work/runtime.env"

# Prepare configuration outside the checkout. No address values are printed.
# Requires PyYAML and python-dotenv in the selected Python environment.
PYTHONPATH="$work/source/status-api" python3 - "$work/runtime.env" <<'PY'
import os
import sys
from urllib.parse import urlsplit
import yaml
from dotenv import set_key
from internal_targets import internal_service_url

variables = {
    'uptime.techfusionreport.com': 'UPTIME_KUMA_INTERNAL_URL',
    'glances-hetzner.techfusionreport.com': 'GLANCES_HETZNER_INTERNAL_URL',
}
with open('/etc/cloudflared/config.yml') as stream:
    ingress = yaml.safe_load(stream).get('ingress', [])
values = {'SYNCTHING_INTERNAL_URL': 'http://127.0.0.1:8384'}
os.environ['SYNCTHING_INTERNAL_URL'] = values['SYNCTHING_INTERNAL_URL']
if not internal_service_url('SYNCTHING_INTERNAL_URL'):
    raise SystemExit('STOP: invalid verified Syncthing target')
for hostname, variable in variables.items():
    entries = [entry for entry in ingress if entry.get('hostname') == hostname]
    if len(entries) != 1 or not isinstance(entries[0].get('service'), str):
        raise SystemExit('STOP: missing or ambiguous ingress service for ' + hostname)
    value = entries[0]['service']
    os.environ[variable] = value
    host = (urlsplit(value).hostname or '').lower().rstrip('.')
    if not internal_service_url(variable) or host == 'techfusionreport.com' or host.endswith('.techfusionreport.com'):
        raise SystemExit('STOP: invalid private ingress target for ' + hostname)
    values[variable] = value
for variable, value in values.items():
    set_key(sys.argv[1], variable, value)
print('Prepared three private target settings; values withheld.')
PY

# Smoke-test candidate code using the staged environment and a temporary output.
# This does not replace the deployed status.json.
python3 - "$work" <<'PY'
import json
import os
from pathlib import Path
import runpy
import sys
from dotenv import load_dotenv

work = Path(sys.argv[1])
load_dotenv(work / 'runtime.env', override=True)
os.environ['OUTPUT_FILE'] = str(work / 'status.json')
sys.path.insert(0, str(work / 'source/status-api'))
runpy.run_path(str(work / 'source/status-api/collect.py'), run_name='__main__')
with open(work / 'status.json') as stream:
    json.load(stream)
print('Candidate generated valid JSON. Review probe results privately before installing.')
PY

# Review the temporary JSON locally. Do not paste its contents into the PR.
# Stop if any of the three private probes is unexpectedly down.
read -r -p 'Private probe results reviewed and acceptable? Type yes: ' reviewed
test "$reviewed" = yes

# Keep backups outside the repository, including its private environment.
backup=$(mktemp -d "$HOME/tfr-probes-backup.XXXXXX")
cp -p "$deploy/collect.py" "$backup/collect.py"
cp -p "$deploy/.env" "$backup/runtime.env"
if test -f "$deploy/internal_targets.py"; then
  cp -p "$deploy/internal_targets.py" "$backup/internal_targets.py"
fi

# Install helper first, then environment, then collector; rename atomically.
install -m 644 "$work/source/status-api/internal_targets.py" "$deploy/internal_targets.py.next"
mv "$deploy/internal_targets.py.next" "$deploy/internal_targets.py"
install -m 600 "$work/runtime.env" "$deploy/.env.next"
mv "$deploy/.env.next" "$deploy/.env"
install -m 644 "$work/source/status-api/collect.py" "$deploy/collect.py.next"
mv "$deploy/collect.py.next" "$deploy/collect.py"
python3 -B "$deploy/collect.py"
printf 'Backup directory: %s\n' "$backup"
```

Privately verify the existing /status.json endpoint after the next scheduled run: oracle/Uptime Kuma and hetzner/Syncthing/Glances should retain their existing result shape and reflect service health. There is no daemon restart: the existing cron invocation loads the new collector on its next run. Only put the public hosts behind Access after the private checks succeed. If needed, restore collect.py and runtime.env from the printed backup directory with the same atomic install/rename procedure.

Agent: Codex
Task: Move three status probes off public Access-protected hostnames
Risk: Medium; runtime configuration required; Syncthing loopback target verified; no deployment performed
