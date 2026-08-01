/// <reference path="../pb_data/types.d.ts" />

/**
 * Go-Chat — Auto-create first admin account from environment variables.
 * Runs once on PocketBase startup. Safe to keep running — does nothing
 * if an admin already exists or env vars are not set.
 *
 * Required env vars on Render (set via dashboard, never in git):
 *   ADMIN_EMAIL    — e.g. admin@gochat.internal
 *   ADMIN_PASSWORD — the secure admin password
 */

onBootstrap((e) => {
    e.next(); // Let PocketBase finish booting first

    const adminEmail    = $os.getenv("ADMIN_EMAIL")    || "admin@gochat.internal";
    const adminPassword = $os.getenv("ADMIN_PASSWORD");

    if (!adminPassword) {
        console.log("[AdminSetup] ⚠️  ADMIN_PASSWORD not set — skipping auto-create.");
        return;
    }

    // Check if admin already exists — skip if so
    try {
        $app.dao().findAdminByEmail(adminEmail);
        console.log(`[AdminSetup] ℹ️  Admin '${adminEmail}' already exists — no action needed.`);
        return;
    } catch (_) {
        // Admin not found — safe to create
    }

    // Create the admin account
    try {
        const admin = new Admin();
        admin.email = adminEmail;
        admin.setPassword(adminPassword);
        $app.dao().saveAdmin(admin);
        console.log(`[AdminSetup] ✅ Admin account created: ${adminEmail}`);
    } catch (err) {
        console.error("[AdminSetup] ❌ Failed to create admin:", String(err));
    }
});
