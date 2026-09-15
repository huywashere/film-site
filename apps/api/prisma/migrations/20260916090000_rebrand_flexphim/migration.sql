-- Rebrand user-facing defaults without renaming compatibility-sensitive keys.
ALTER TABLE "site_configuration"
  ALTER COLUMN "seoTitle" SET DEFAULT 'FlexPhim - Xem phim trực tuyến';

UPDATE "site_configuration"
SET "seoTitle" = 'FlexPhim - Xem phim trực tuyến'
WHERE "seoTitle" = 'NetPhim - Xem phim trực tuyến';

UPDATE "site_configuration"
SET "homePopupTitle" = 'Thông báo từ FlexPhim'
WHERE "homePopupTitle" = 'Thông báo từ NetPhim';

UPDATE "site_configuration"
SET
  "maintenanceNotice" = replace("maintenanceNotice", 'NetPhim', 'FlexPhim'),
  "announcementText" = replace("announcementText", 'NetPhim', 'FlexPhim'),
  "homePopupBody" = replace("homePopupBody", 'NetPhim', 'FlexPhim'),
  "homePopupLinkLabel" = replace("homePopupLinkLabel", 'NetPhim', 'FlexPhim'),
  "homePopupDismissLabel" = replace("homePopupDismissLabel", 'NetPhim', 'FlexPhim'),
  "seoDescription" = replace("seoDescription", 'NetPhim', 'FlexPhim')
WHERE
  "maintenanceNotice" LIKE '%NetPhim%'
  OR "announcementText" LIKE '%NetPhim%'
  OR "homePopupBody" LIKE '%NetPhim%'
  OR "homePopupLinkLabel" LIKE '%NetPhim%'
  OR "homePopupDismissLabel" LIKE '%NetPhim%'
  OR "seoDescription" LIKE '%NetPhim%';

UPDATE "admin_notifications"
SET
  "title" = replace("title", 'NetPhim', 'FlexPhim'),
  "message" = replace("message", 'NetPhim', 'FlexPhim')
WHERE "title" LIKE '%NetPhim%' OR "message" LIKE '%NetPhim%';

UPDATE "system_notifications"
SET
  "title" = replace("title", 'NetPhim', 'FlexPhim'),
  "message" = replace("message", 'NetPhim', 'FlexPhim')
WHERE "title" LIKE '%NetPhim%' OR "message" LIKE '%NetPhim%';

UPDATE "user_notifications"
SET
  "title" = replace("title", 'NetPhim', 'FlexPhim'),
  "body" = replace("body", 'NetPhim', 'FlexPhim')
WHERE "title" LIKE '%NetPhim%' OR "body" LIKE '%NetPhim%';
