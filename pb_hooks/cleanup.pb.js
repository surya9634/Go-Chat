/// <reference path="../pb_data/types.d.ts" />

/**
 * Go-Chat — Weekly message cleanup (PocketBase v0.22 compatible)
 * Runs every Sunday at 2:00 AM. Also exposes a manual endpoint.
 */

// ─── Weekly Cleanup Cron ──────────────────────────────────────────────────────
cronAdd("weekly_message_cleanup", "0 2 * * 0", () => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().replace("T", " ").substring(0, 19);

    try {
        $app.db()
            .newQuery(`DELETE FROM messages WHERE created < {:cutoff}`)
            .bind({ cutoff: cutoffStr })
            .execute();

        console.log("[Go-Chat Cleanup] ✅ Deleted messages older than 7 days (cutoff: " + cutoffStr + ")");
    } catch (err) {
        console.error("[Go-Chat Cleanup] ❌ Error:", String(err));
    }
});

// ─── Manual Cleanup Endpoint (token-protected) ────────────────────────────────
// POST /api/admin-cleanup  with header: X-Admin-Token: <ADMIN_PASSWORD>
routerAdd("POST", "/api/admin-cleanup", (c) => {
    const adminPassword = $os.getenv("ADMIN_PASSWORD") || "Namo_narayan5252";
    const token = c.request().header.get("X-Admin-Token");

    if (!token || token !== adminPassword) {
        c.response().writeHeader(403);
        return c.json(403, { error: "Forbidden" });
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().replace("T", " ").substring(0, 19);

    try {
        $app.db()
            .newQuery(`DELETE FROM messages WHERE created < {:cutoff}`)
            .bind({ cutoff: cutoffStr })
            .execute();

        return c.json(200, {
            success: true,
            message: "Deleted messages older than 7 days",
            cutoff: cutoffStr,
        });
    } catch (err) {
        return c.json(500, { success: false, error: String(err) });
    }
});
