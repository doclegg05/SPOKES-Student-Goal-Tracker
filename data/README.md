# Classroom data store

Live student goal data lives in the FERPA quarantine (not in this folder):

```
../../_student-records/SPOKES Goal Setting Project/data/student-goals.json
```

Point the server at it with `SPOKES_DATA_FILE` (see `.env.example`), or rely on
`server.js`'s default which already resolves to that path.

Synthetic E2E fixture stays here: `student-goals.e2e.json`.
