/// <reference path="../pb_data/types.d.ts" />

/**
 * Go-Chat — PocketBase Hooks
 * Auto-cleanup: delete messages older than 7 days
 * Runs every Sunday at 2:00 AM server time.
 */

// ─── Weekly Cleanup Cron ─────────────────────────────────────────────────────
cronAdd("weekly_message_cleanup", "0 2 * * 0", () => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // Format: "2024-01-01 02:00:00.000Z"
    const cutoffStr = cutoff.toISOString().replace("T", " ").substring(0, 23) + "Z";

    try {
        $app.db()
            .newQuery(`DELETE FROM messages WHERE created < {:cutoff}`)
            .bind({ cutoff: cutoffStr })
            .execute();

        console.log(`[Go-Chat Cleanup] ✅ Deleted messages older than 7 days (cutoff: ${cutoffStr})`);
    } catch (err) {
        console.error("[Go-Chat Cleanup] ❌ Error during weekly cleanup:", String(err));
    }
});

// ─── Manual Cleanup Endpoint (Admin only) ────────────────────────────────────
// Trigger: GET /api/manual-cleanup  (requires admin auth header)
routerAdd("GET", "/api/manual-cleanup", (e) => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().replace("T", " ").substring(0, 23) + "Z";

    try {
        $app.db()
            .newQuery(`DELETE FROM messages WHERE created < {:cutoff}`)
            .bind({ cutoff: cutoffStr })
            .execute();

        return e.json(200, {
            success: true,
            message: `Deleted messages older than 7 days`,
            cutoff: cutoffStr,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        return e.json(500, {
            success: false,
            error: String(err),
        });
    }
}, $apis.requireSuperadminAuth());

// ─── Startup Log ─────────────────────────────────────────────────────────────
onBootstrap((e) => {
    e.next();
    console.log("🚀 [Go-Chat] Hooks loaded. Weekly cleanup cron active (every Sunday 2AM).");
});
