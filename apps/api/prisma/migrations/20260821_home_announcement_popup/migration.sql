ALTER TABLE "site_configuration"
ADD COLUMN "homePopupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "homePopupTitle" TEXT,
ADD COLUMN "homePopupBody" TEXT,
ADD COLUMN "homePopupLink" TEXT,
ADD COLUMN "homePopupLinkLabel" TEXT,
ADD COLUMN "homePopupDismissLabel" TEXT,
ADD COLUMN "homePopupVersion" INTEGER NOT NULL DEFAULT 1;
