/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2782804830")

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "date3629734670",
    "max": "",
    "min": "",
    "name": "complete_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2782804830")

  // remove field
  collection.fields.removeById("date3629734670")

  return app.save(collection)
})
