/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  // 1. Configure users (_pb_users_auth_) collection
  try {
    const users = dao.findCollectionByNameOrId("_pb_users_auth_");
    users.createRule = "";
    users.listRule = "@request.auth.id != ''";
    users.viewRule = "@request.auth.id != ''";
    users.updateRule = "@request.auth.id = id";
    users.deleteRule = "@request.auth.id = id";

    const bioField = users.schema.getFieldByName("bio");
    if (!bioField) {
      users.schema.addField(new SchemaField({ id: "usr_bio", name: "bio", type: "text" }));
    }
    const lastSeenField = users.schema.getFieldByName("last_seen");
    if (!lastSeenField) {
      users.schema.addField(new SchemaField({ id: "usr_last_seen", name: "last_seen", type: "date" }));
    }
    const onlineField = users.schema.getFieldByName("online");
    if (!onlineField) {
      users.schema.addField(new SchemaField({ id: "usr_online", name: "online", type: "bool" }));
    }
    dao.saveCollection(users);
  } catch (e) {
    console.log("Users init migration note:", e);
  }

  // 2. Conversations
  try {
    dao.findCollectionByNameOrId("conversations_col");
  } catch (_) {
    const conversations = new Collection({
      id: "conversations_col",
      name: "conversations",
      type: "base",
      listRule: "@request.auth.id != '' && conversation_members_via_conversation.user ?= @request.auth.id",
      viewRule: "@request.auth.id != '' && conversation_members_via_conversation.user ?= @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id = created_by",
      schema: [
        { id: "conv_type", name: "type", type: "select", required: true, options: { maxSelect: 1, values: ["private", "group"] } },
        { id: "conv_name", name: "name", type: "text" },
        { id: "conv_image", name: "image", type: "file", options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"] } },
        { id: "conv_created_by", name: "created_by", type: "relation", options: { collectionId: "_pb_users_auth_", maxSelect: 1 } }
      ]
    });
    dao.saveCollection(conversations);
  }

  // 3. Conversation members
  try {
    dao.findCollectionByNameOrId("conv_members_col");
  } catch (_) {
    const members = new Collection({
      id: "conv_members_col",
      name: "conversation_members",
      type: "base",
      indexes: [
        "CREATE UNIQUE INDEX `idx_conv_user` ON `conversation_members` (`conversation`, `user`)"
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      schema: [
        { id: "mem_conv", name: "conversation", type: "relation", required: true, options: { collectionId: "conversations_col", maxSelect: 1, cascadeDelete: true } },
        { id: "mem_user", name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true } },
        { id: "mem_role", name: "role", type: "select", required: true, options: { maxSelect: 1, values: ["owner", "admin", "member"] } }
      ]
    });
    dao.saveCollection(members);
  }

  // 4. Messages
  try {
    dao.findCollectionByNameOrId("messages_col");
  } catch (_) {
    const messages = new Collection({
      id: "messages_col",
      name: "messages",
      type: "base",
      indexes: [
        "CREATE INDEX `idx_msg_conv_created` ON `messages` (`conversation`, `created`)"
      ],
      listRule: "@request.auth.id != '' && conversation.conversation_members_via_conversation.user ?= @request.auth.id",
      viewRule: "@request.auth.id != '' && conversation.conversation_members_via_conversation.user ?= @request.auth.id",
      createRule: "@request.auth.id = sender && conversation.conversation_members_via_conversation.user ?= @request.auth.id",
      updateRule: "@request.auth.id = sender",
      deleteRule: "@request.auth.id = sender",
      schema: [
        { id: "msg_conv", name: "conversation", type: "relation", required: true, options: { collectionId: "conversations_col", maxSelect: 1, cascadeDelete: true } },
        { id: "msg_sender", name: "sender", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { id: "msg_text", name: "text", type: "text" },
        { id: "msg_attachment", name: "attachment", type: "file", options: { maxSelect: 5, maxSize: 52428800 } },
        { id: "msg_reply_to", name: "reply_to", type: "relation", options: { collectionId: "messages_col", maxSelect: 1 } },
        { id: "msg_edited", name: "edited", type: "bool" },
        { id: "msg_deleted", name: "deleted", type: "bool" },
        { id: "msg_pinned", name: "pinned", type: "bool" }
      ]
    });
    dao.saveCollection(messages);
  }

  // 5. Reactions
  try {
    dao.findCollectionByNameOrId("reactions_col");
  } catch (_) {
    const reactions = new Collection({
      id: "reactions_col",
      name: "reactions",
      type: "base",
      indexes: [
        "CREATE UNIQUE INDEX `idx_react_msg_user_emoji` ON `reactions` (`message`, `user`, `emoji`)"
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id = user",
      updateRule: "@request.auth.id = user",
      deleteRule: "@request.auth.id = user",
      schema: [
        { id: "react_msg", name: "message", type: "relation", required: true, options: { collectionId: "messages_col", maxSelect: 1, cascadeDelete: true } },
        { id: "react_user", name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true } },
        { id: "react_emoji", name: "emoji", type: "text", required: true, options: { min: 1, max: 10 } }
      ]
    });
    dao.saveCollection(reactions);
  }

  // 6. Read receipts
  try {
    dao.findCollectionByNameOrId("read_receipts_col");
  } catch (_) {
    const readReceipts = new Collection({
      id: "read_receipts_col",
      name: "read_receipts",
      type: "base",
      indexes: [
        "CREATE UNIQUE INDEX `idx_rr_msg_user` ON `read_receipts` (`message`, `user`)"
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id = user",
      updateRule: "@request.auth.id = user",
      deleteRule: "@request.auth.id = user",
      schema: [
        { id: "rr_msg", name: "message", type: "relation", required: true, options: { collectionId: "messages_col", maxSelect: 1, cascadeDelete: true } },
        { id: "rr_user", name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true } },
        { id: "rr_read_at", name: "read_at", type: "date", required: true }
      ]
    });
    dao.saveCollection(readReceipts);
  }

  // 7. Files
  try {
    dao.findCollectionByNameOrId("files_col");
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
        { id: "file_item", name: "file", type: "file", required: true, options: { maxSelect: 1, maxSize: 104857600 } },
        { id: "file_by", name: "uploaded_by", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
        { id: "file_type", name: "type", type: "text" },
        { id: "file_size", name: "size", type: "number", options: { noDecimal: true } }
      ]
    });
    dao.saveCollection(files);
  }
}, (db) => {
});
