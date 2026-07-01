/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1321337024")

  // add field
  collection.fields.addAt(20, new Field({
    "help": "",
    "hidden": false,
    "id": "bool3306775957",
    "name": "label_printed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1321337024")

  // remove field
  collection.fields.removeById("bool3306775957")

  return app.save(collection)
})
