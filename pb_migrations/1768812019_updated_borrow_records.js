/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"admin\" || (@request.auth.id = user.id && status = \"borrowed\")",
    "updateRule": "@request.auth.role = \"admin\" || (@request.auth.id = user.id && status = \"borrowed\")"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = \"admin\" || (@request.auth.id = user.id && status != \"returned\")",
    "updateRule": "@request.auth.role = \"admin\" || (@request.auth.id = user.id && status != \"returned\")"
  }, collection)

  return app.save(collection)
})
