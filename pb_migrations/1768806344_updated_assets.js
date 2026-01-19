/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1321337024")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_1rAFkxILNR` ON `assets` (`asset_id`)",
      "CREATE INDEX `idx_IyccKPhVry` ON `assets` (\n  `status`,\n  `category`,\n  `total_risk_score`\n)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1321337024")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_1rAFkxILNR` ON `assets` (`asset_id`)"
    ]
  }, collection)

  return app.save(collection)
})
