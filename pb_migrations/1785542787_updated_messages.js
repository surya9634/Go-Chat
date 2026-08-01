/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("messages_col")

  collection.listRule = "@request.auth.id != '' && conversation.conversation_members_via_conversation.user ?= @request.auth.id"
  collection.viewRule = "@request.auth.id != '' && conversation.conversation_members_via_conversation.user ?= @request.auth.id"
  collection.createRule = "@request.auth.id = sender && conversation.conversation_members_via_conversation.user ?= @request.auth.id"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("messages_col")

  collection.listRule = "@request.auth.id != ''"
  collection.viewRule = "@request.auth.id != ''"
  collection.createRule = "@request.auth.id = sender"

  return dao.saveCollection(collection)
})
