/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381")

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3788167225",
    "max": 0,
    "min": 0,
    "name": "remark",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381")

  // remove field
  collection.fields.removeById("text3788167225")

  return app.save(collection)
})
