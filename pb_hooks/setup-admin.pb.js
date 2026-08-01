/// <reference path="../pb_data/types.d.ts" />

/**
 * Go-Chat — Admin Auth Hook (PocketBase v0.22 compatible)
 *
 * POST /api/go-admin/auth?pw=YOUR_PASSWORD
 *
 * Verifies password, auto-creates admin account, returns PocketBase admin token.
 */

routerAdd("POST", "/api/go-admin/auth", (c) => {
    // Read password from query parameter (simple, reliable in v0.22)
    const submittedPassword = c.queryParam("pw") || "";

    if (!submittedPassword) {
        return c.json(400, { code: 400, message: "Password is required" });
    }

    const adminPassword = $os.getenv("ADMIN_PASSWORD") || "Namo_narayan5252";
    const adminEmail    = $os.getenv("ADMIN_EMAIL")    || "admin@gochat.internal";

    if (submittedPassword !== adminPassword) {
        let x = 0; for (let i = 0; i < 500000; i++) x += i; // delay
        return c.json(401, { code: 401, message: "Invalid password" });
    }

    // Find or auto-create admin
    let admin;
    try {
        admin = $app.dao().findAdminByEmail(adminEmail);
    } catch (_) {
        try {
            const newAdmin = new Admin();
            newAdmin.email = adminEmail;
            newAdmin.setPassword(adminPassword);
            $app.dao().saveAdmin(newAdmin);
            admin = $app.dao().findAdminByEmail(adminEmail);
            console.log("[AdminAuth] ✅ Auto-created admin: " + adminEmail);
        } catch (createErr) {
            return c.json(500, { code: 500, message: "Failed to create admin: " + String(createErr) });
        }
    }

    // Issue PocketBase admin token
    try {
        const token = $tokens.adminAuthToken($app, admin);
        return c.json(200, { token: token, admin: { id: admin.id, email: admin.email } });
    } catch (tokenErr) {
        return c.json(500, { code: 500, message: "Token error: " + String(tokenErr) });
    }
});
