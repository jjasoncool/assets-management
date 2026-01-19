/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_llXBM33Z3b` ON `borrow_records` (\n  `asset`,\n  `status`\n)",
      "CREATE INDEX `idx_eAKKM5ppBI` ON `borrow_records` (`user`)",
      "CREATE INDEX `idx_oQPfzLChKF` ON `borrow_records` (`expected_return_date`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
