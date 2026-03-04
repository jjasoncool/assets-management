/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "resetPasswordTemplate": {
      "body": "<div style=\"background-color: #f8f9fa; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;\">\n    <div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);\">\n        \n        <div style=\"text-align: center; padding: 40px 20px 20px; background-color: #ffffff;\">\n            <img src=\"https://github.com/TaneshimaPopura/images/blob/main/EGST-mail-logo.jpg?raw=true\" alt=\"Logo\" style=\"max-width: 180px; height: auto; display: block; margin: 0 auto;\" />\n        </div>\n\n        <div style=\"padding: 0 40px 40px;\">\n            <h2 style=\"color: #2c3e50; font-size: 20px; margin-bottom: 20px; text-align: center;\">Password Reset Request</h2>\n            \n            <p style=\"margin-bottom: 20px; color: #555;\">Hello,</p>\n            <p style=\"margin-bottom: 25px; color: #555;\">\n                You are receiving this email because we received a password reset request for your account at <strong>{APP_NAME}</strong>. Please click the button below to set your new password:\n            </p>\n\n            <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin-bottom: 25px;\">\n                <tr>\n                    <td align=\"center\">\n                        <a href=\"{APP_URL}/password-reset/{TOKEN}\" target=\"_blank\" rel=\"noopener\" style=\"display: inline-block; background-color: #0d6efd; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: bold; border-radius: 6px; box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2);\">\n                            Reset Password\n                        </a>\n                    </td>\n                </tr>\n            </table>\n\n            <p style=\"margin-bottom: 20px; color: #888; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;\">\n                <i>If you didn't ask to reset your password, you can safely ignore this email. Your password and account security will remain unchanged.</i>\n            </p>\n\n            <p style=\"margin: 0; color: #555;\">\n                Thanks,<br/>\n                <strong>The {APP_NAME} Team</strong>\n            </p>\n        </div>\n    </div>\n    \n    <div style=\"text-align: center; margin-top: 20px; color: #999; font-size: 12px;\">\n        <p style=\"margin: 0;\">This is an automated message, please do not reply directly.</p>\n        <p style=\"margin: 5px 0 0;\">&copy; 2026 {APP_NAME}. All rights reserved.</p>\n    </div>\n</div>"
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "resetPasswordTemplate": {
      "body": "<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/password-reset/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Reset password</a>\n</p>\n<p><i>If you didn't ask to reset your password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
    }
  }, collection)

  return app.save(collection)
})
