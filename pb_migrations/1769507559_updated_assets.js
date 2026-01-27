/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1321337024")

  // update field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "file3760176746",
    "maxSelect": 10,
    "maxSize": 5242880,
    "mimeTypes": [
      "image/jpeg",
      "image/vnd.mozilla.apng",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heic-sequence"
    ],
    "name": "images",
    "presentable": false,
    "protected": true,
    "required": false,
    "system": false,
    "thumbs": [
      "200x200",
      "800x0"
    ],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1321337024")

  // update field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "file3760176746",
    "maxSelect": 10,
    "maxSize": 5242880,
    "mimeTypes": [
      "image/jpeg",
      "image/vnd.mozilla.apng",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heic-sequence"
    ],
    "name": "images",
    "presentable": false,
    "protected": true,
    "required": false,
    "system": false,
    "thumbs": [
      "100x100",
      "800x0"
    ],
    "type": "file"
  }))

  return app.save(collection)
})
