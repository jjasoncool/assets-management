/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1321337024",
        "hidden": false,
        "id": "relation45046364",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "asset",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation2375276105",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "date699600223",
        "max": "",
        "min": "",
        "name": "borrow_date",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date2156530882",
        "max": "",
        "min": "",
        "name": "expected_return_date",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "borrowed",
          "returned",
          "overdue"
        ]
      },
      {
        "hidden": false,
        "id": "file3470799890",
        "maxSelect": 10,
        "maxSize": 5242880,
        "mimeTypes": [
          "image/png",
          "image/vnd.mozilla.apng",
          "image/jpeg",
          "image/webp",
          "image/heic",
          "image/heic-sequence",
          "image/gif"
        ],
        "name": "borrow_images",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [
          "100x100",
          "800x0"
        ],
        "type": "file"
      },
      {
        "hidden": false,
        "id": "file2764186805",
        "maxSelect": 10,
        "maxSize": 5242880,
        "mimeTypes": [
          "image/png",
          "image/vnd.mozilla.apng",
          "image/jpeg",
          "image/webp",
          "image/heic",
          "image/heic-sequence",
          "image/gif"
        ],
        "name": "return_images",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [
          "100x100",
          "800x0"
        ],
        "type": "file"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3850775381",
    "indexes": [],
    "listRule": null,
    "name": "borrow_records",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3850775381");

  return app.delete(collection);
})
