/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2782804830")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role ?~ \"admin\" || (@request.auth.id = performed_by.id)",
    "updateRule": "@request.auth.role ?~ \"admin\" || (@request.auth.id = performed_by.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2782804830")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"admin\" || (@request.auth.id = performed_by.id)",
    "updateRule": "@request.auth.role = \"admin\" || (@request.auth.id = performed_by.id)"
  }, collection)

  return app.save(collection)
})
