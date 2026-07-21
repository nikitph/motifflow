# Operations

Apply migrations before starting the API:

```bash
psql "$DATABASE_URL" -f migrations/001_initial.sql
npm run api
```

Required environment:

- `DATABASE_URL`: PostgreSQL connection string for API and CLI.
- `PORT`: API port, default `3000`.
- `DEEPSEEK_API_KEY`: only needed by a process invoking the DeepSeek operator.
- `DEEPSEEK_MODEL`: optional, default `deepseek-chat`.

The PostgreSQL recovery test validates event replay, optimistic conflict rejection, one-worker claims under concurrency, process-instance restart recovery, persisted timer firing, and signal deduplication.

Do not log model context or secrets. Operational telemetry should include workflow, correlation, causation, proposal, activity, and event identifiers, while payloads remain redacted or allowlisted.
