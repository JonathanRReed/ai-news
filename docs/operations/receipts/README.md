# Local Migration Receipts

This directory is the local destination for production database exports,
catalog snapshots, backfill comparisons, and hash receipts. Everything in the
directory is ignored except this README because a complete database export may
contain private operational values or credentials embedded in legacy jobs.

Before a production migration, create all of the following locally:

- a complete schema export;
- a complete data export;
- a sanitized catalog summary;
- SHA-256 hashes for every export;
- a row-count, date-range, duplicate, and null-field comparison;
- the exact Git SHA and Supabase project ref used for the operation.

Never paste secrets, cron command bodies, service-role credentials, or database
passwords into a tracked file. A migration is blocked if the complete export
or any required hash is missing.
