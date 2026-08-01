migrate((db) => {
  const dao = new Dao(db);

  // 1. Update users collection rules & fields
  try {
    const users = dao.findCollectionByNameOrId("users");
    users.listRule = "@request.auth.id != ''";
    users.viewRule = "@request.auth.id != ''";

    const bioField = users.schema.getFieldByName("bio");
    if (!bioField) {
      users.schema.addField(new SchemaField({
        id: "usr_bio",
        name: "bio",
        type: "text"
      }));
    }

    const lastSeenField = users.schema.getFieldByName("last_seen");
    if (!lastSeenField) {
      users.schema.addField(new SchemaField({
        id: "usr_last_seen",
        name: "last_seen",
        type: "date"
      }));
    }

    const onlineField = users.schema.getFieldByName("online");
    if (!onlineField) {
      users.schema.addField(new SchemaField({
        id: "usr_online",
        name: "online",
        type: "bool"
      }));
    }

    dao.saveCollection(users);
  } catch (e) {
    console.log("Users schema migration:", e);
  }

  // 2. Conversations collection
  try {
    dao.findCollectionByNameOrId("conversations");
  } catch (_) {
    const conversations = new Collection({
      id: "conversations_col",
      name: "conversations",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id = created_by",
      schema: [
        { name: "type", type: "select", required: true, options: { maxSelect: 1, values: ["private", "group"] } },
        { name: "name", type: "text" },
        { name: "image", type: "file", options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] } },
        { name: "created_by", type: "relation", options: { collectionId: "_pb_users_auth_", maxSelect: 1 } }
      ]
    });
    dao.saveCollection(conversations);
  }

  // 3. Conversation members collection
  try {
    dao.findCollectionByNameOrId("conversation_members");
  } catch (_) {
    const members = new Collection({
      id: "conv_members_col",
      name: "conversation_members",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      schema: [
        { name: "conversation", type: "relation", required: true, options: { collectionId: "conversations_col", maxSelect: 1, cascadeDelete: true } },
        { name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true } },
        { name: "role", type: "select", required: true, options: { maxSelect: 1, values: ["owner", "admin", "member"] } }
      ]
    });
    dao.saveCollection(members);
  }

  // 4. Messages collection
  try {
    dao.findCollectionByNameOrId("messages");
  } catch (_) {
    const messages = new Collection({
      id: "messages_col",
      name: "messages",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id = sender",
      updateRule: "@request.auth.id = sender",
      deleteRule: "@request.auth.id = sender",
      schema: [
        { name: "conversation", type: "relation", required: true, options: { collectionId: "conversations_col", maxSelect: 1, cascadeDelete: true } },
        { name: "sender", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "text", type: "text" },
        { name: "attachment", type: "file", options: { maxSelect: 5, maxSize: 52428800 } },
        { name: "reply_to", type: "relation", options: { collectionId: "messages_col", maxSelect: 1 } },
        { name: "edited", type: "bool" },
        { name: "deleted", type: "bool" },
        { name: "pinned", type: "bool" }
      ]
    });
    dao.saveCollection(messages);
  }

  // 5. Reactions collection
  try {
    dao.findCollectionByNameOrId("reactions");
  } catch (_) {
    const reactions = new Collection({
      id: "reactions_col",
      name: "reactions",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id = user",
      updateRule: "@request.auth.id = user",
      deleteRule: "@request.auth.id = user",
      schema: [
        { name: "message", type: "relation", required: true, options: { collectionId: "messages_col", maxSelect: 1, cascadeDelete: true } },
        { name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true } },
        { name: "emoji", type: "text", required: true }
      ]
    });
    dao.saveCollection(reactions);
  }

  // 6. Read receipts collection
  try {
    dao.findCollectionByNameOrId("read_receipts");
  } catch (_) {
    const readReceipts = new Collection({
      id: "read_receipts_col",
      name: "read_receipts",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id = user",
      updateRule: "@request.auth.id = user",
      deleteRule: "@request.auth.id = user",
      schema: [
        { name: "message", type: "relation", required: true, options: { collectionId: "messages_col", maxSelect: 1, cascadeDelete: true } },
        { name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true } },
        { name: "read_at", type: "date", required: true }
      ]
    });
    dao.saveCollection(readReceipts);
  }

  // 7. Files collection
  try {
    dao.findCollectionByNameOrId("files");
  } catch (_) {
    const files = new Collection({
      id: "files_col",
      name: "files",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id = uploaded_by",
      updateRule: "@request.auth.id = uploaded_by",
      deleteRule: "@request.auth.id = uploaded_by",
      schema: [
        { name: "file", type: "file", required: true, options: { maxSelect: 1, maxSize: 104857600 } },
        { name: "uploaded_by", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { name: "type", type: "text" },
        { name: "size", type: "number" }
      ]
    });
    dao.saveCollection(files);
  }
}, (db) => {
});
