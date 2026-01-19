/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_assets_maint_01", // 固定 Collection ID
    "name": "maintenance_records",
    "type": "base",
    "system": false,
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": null,
    "fields": [
      {
        // 系統主鍵 ID
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "system": true,
        "required": true,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}",
        "max": 15,
        "min": 15,
        "pattern": "^[a-z0-9]+$"
      },
      {
        // 關聯到資產主表 (assets)
        "id": "relation105650625",
        "name": "asset",
        "type": "relation",
        "system": false,
        "required": true,
        "collectionId": "pbc_1321337024", // 對應你 assets 的 ID
        "cascadeDelete": false,
        "maxSelect": 1,
        "minSelect": 0
      },
      {
        // 維修日期
        "id": "date3660447513",
        "name": "maintenance_date",
        "type": "date",
        "system": false,
        "required": true,
        "max": "",
        "min": ""
      },
      {
        // 維修類型 (預防性、修正性、檢查)
        "id": "select2063623452",
        "name": "maintenance_type",
        "type": "select",
        "system": false,
        "required": true,
        "maxSelect": 1,
        "values": [
          "preventive",
          "corrective",
          "inspection"
        ]
      },
      {
        // 維修內容描述
        "id": "text1579384326",
        "name": "description",
        "type": "text",
        "system": false,
        "required": false,
        "autogeneratePattern": ""
      },
      {
        // 維修花費
        "id": "number503554547",
        "name": "cost",
        "type": "number",
        "system": false,
        "required": false,
        "min": null,
        "max": null,
        "onlyInt": false
      },
      {
        // 執行人員 (關聯系統使用者)
        "id": "relation2314121105",
        "name": "performed_by",
        "type": "relation",
        "system": false,
        "required": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": false,
        "maxSelect": 1,
        "minSelect": 0
      },
      {
        // 維修照片
        "id": "file3760176746",
        "name": "maintenance_images",
        "type": "file",
        "system": false,
        "required": false,
        "maxSelect": 5,
        "maxSize": 5242880,
        "protected": true,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/webp"
        ],
        "thumbs": [
          "100x100",
          "800x0"
        ]
      },
      {
        // 自動記錄建立時間
        "id": "autodate2990389176",
        "name": "created",
        "type": "autodate",
        "system": false,
        "onCreate": true,
        "onUpdate": false
      },
      {
        // 自動記錄更新時間
        "id": "autodate3332085495",
        "name": "updated",
        "type": "autodate",
        "system": false,
        "onCreate": true,
        "onUpdate": true
      }
    ],
    "indexes": []
  });

  return app.save(collection);
}, (app) => {
  // 復原邏輯：刪除維修紀錄表
  const collection = app.findCollectionByNameOrId("pbc_assets_maint_01");
  return app.delete(collection);
});