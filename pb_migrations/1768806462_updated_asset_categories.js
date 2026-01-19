/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3799849911")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_cPKqhXbBzE` ON `asset_categories` (`prefix`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3799849911")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
