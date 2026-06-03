/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3866499052")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role ?~ \"admin\" || (@request.auth.id != \"\" && is_active = true)",
    "viewRule": "@request.auth.role ?~ \"admin\" || (@request.auth.id != \"\" && is_active = true)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3866499052")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && is_active = true",
    "viewRule": "@request.auth.id != \"\" && is_active = true"
  }, collection)

  return app.save(collection)
})
