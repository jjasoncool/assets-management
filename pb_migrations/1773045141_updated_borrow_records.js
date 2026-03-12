/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "date3412625299",
    "max": "",
    "min": "",
    "name": "return_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381")

  // remove field
  collection.fields.removeById("date3412625299")

  return app.save(collection)
})
