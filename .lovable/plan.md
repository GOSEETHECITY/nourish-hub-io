## Fix

Replace `supabase.functions.invoke("bulk-import-organizations", ...)` in the three call sites with an explicit `fetch` that reads the current session and sets the `Authorization: Bearer <access_token>` header. This guarantees the admin JWT is attached (invoke can silently fall back to the anon key when the session isn't hydrated on the client, which is what's producing the 403).

### Call sites to update
1. `src/pages/Organizations.tsx` — `runBulkImport` (modal on `/admin/organizations`) — send `{ csv_text }`.
2. `src/pages/admin/BulkImportOrganizations.tsx` — `runImport` (dedicated page) — send `{ rows }` (two-pass parents/children preserved).
3. `src/pages/admin/PendingApprovals.tsx` — approve action — send `{ rows }`.

### Pattern applied everywhere

```ts
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
if (!token) throw new Error("Not signed in. Please sign in as an admin and retry.");

const res = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-import-organizations`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload), // { csv_text } or { rows }
  }
);
const data = await res.json().catch(() => ({}));
if (!res.ok) throw new Error(data?.error || `Import failed (${res.status})`);
```

`apikey` is included so the Supabase Functions gateway is happy regardless of the function's `verify_jwt` setting; the edge function itself continues to read `Authorization` and enforce `has_role(..., 'admin')`.

### Verification
- Typecheck runs automatically after the edit.
- End-to-end: sign in as admin, open `/admin/organizations` → Bulk Import, paste a 5-row CSV, run. Confirm HTTP 200 and 5 `created` results in the modal summary. If the harness has an admin session available, I'll drive Playwright against `http://localhost:8080/admin/organizations` to capture the network response as proof; otherwise I'll report the code change and ask you to retry the upload.

No edge function code change is needed — the server already accepts both `csv_text` and `rows` and gates on admin role.