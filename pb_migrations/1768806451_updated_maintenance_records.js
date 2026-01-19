/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2782804830")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_waUvRW9A1Z` ON `maintenance_records` (`asset`)",
      "CREATE INDEX `idx_lIn70dvhfi` ON `maintenance_records` (`maintenance_date`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2782804830")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
