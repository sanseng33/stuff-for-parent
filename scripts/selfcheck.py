#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Offline self-check for parents job H5."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {
    "id", "person", "priority", "title", "company", "city", "salary",
    "schedule", "contactHint", "url", "askTips", "status",
}
PERSONS = {"mom", "dad"}
errors = []

for name in ["index.html", "css/app.css", "js/app.js", "data/jobs.json", "README.md"]:
    if not (ROOT / name).exists():
        errors.append(f"missing file: {name}")

data = json.loads((ROOT / "data/jobs.json").read_text(encoding="utf-8"))
if "updatedAt" not in data:
    errors.append("jobs.json missing updatedAt")
jobs = data.get("jobs") or []
if len(jobs) < 1:
    errors.append("no jobs")

ids = set()
for i, j in enumerate(jobs):
    missing = REQUIRED - set(j)
    if missing:
        errors.append(f"job[{i}] missing {sorted(missing)}")
    if j.get("person") not in PERSONS:
        errors.append(f"job[{i}] bad person {j.get('person')}")
    if j.get("id") in ids:
        errors.append(f"duplicate id {j.get('id')}")
    ids.add(j.get("id"))
    phone = j.get("phone") or ""
    if phone and any(c.isalpha() for c in phone):
        errors.append(f"job {j.get('id')} phone has letters: {phone}")
    # do not invent: empty ok
    lc = j.get("lastChecked") or ""
    if not lc:
        errors.append(f"job {j.get('id')} missing lastChecked")

# Freshness policy: active jobs should not be older than maxAgeDays
from datetime import datetime, timedelta, timezone
TZ = timezone(timedelta(hours=8))
policy = data.get("freshnessPolicy") or {}
max_age = int(policy.get("maxAgeDays") or 7)
today = datetime.now(TZ).date()
stale = []
for j in jobs:
    lc = j.get("lastChecked") or ""
    try:
        d = datetime.strptime(lc, "%Y-%m-%d").date()
    except Exception:
        continue
    if (today - d).days > max_age:
        stale.append(j.get("id"))
if stale:
    errors.append(f"{len(stale)} jobs older than {max_age}d by lastChecked (e.g. {stale[:5]})")

html = (ROOT / "index.html").read_text(encoding="utf-8")
for needle in ["合适的工作", "app.css", "app.js", "btnRefresh"]:
    if needle not in html:
        errors.append(f"index.html missing {needle}")

js = (ROOT / "js/app.js").read_text(encoding="utf-8")
for needle in ["loadJobs", "jobs.json", "tel:", "hashchange"]:
    if needle not in js:
        errors.append(f"app.js missing {needle}")

if errors:
    print("FAIL")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print(f"OK  jobs={len(jobs)} mom={sum(1 for j in jobs if j['person']=='mom')} dad={sum(1 for j in jobs if j['person']=='dad')}")
