# Independent evaluation kit

The project-written 100% and 0-miss numbers are self-written evidence, not independent
accuracy. They must not be presented as production accuracy.

## Collection method

Ask three people who have never seen ScamShield rules or source code to independently
write:

- 10 scam-like SMS/WhatsApp messages
- 10 genuine SMS/WhatsApp messages

This produces 30 scam-like and 30 genuine messages in the first independent batch.
Do not show the example set or detector labels while collecting.

Create `independent_eval.csv` with:

```csv
text,expected
"...",scam
"...",safe
```

## Optional result table

| Source person | Scam-like | Genuine | Misses | False positives | Notes |
|---|---:|---:|---:|---:|---|
| Person 1 | 10 | 10 | | | |
| Person 2 | 10 | 10 | | | |
| Person 3 | 10 | 10 | | | |

## Run

Start the backend on port 8000, then:

```bash
node scripts/run_eval.mjs independent_eval.csv
```

The script prints TS accuracy, Python accuracy, misses, false positives and TS/Python
differences. It also reports the backend unreachable case honestly.
