ALTER TABLE "site_configuration"
ALTER COLUMN "homeSectionOrder" SET DEFAULT ARRAY[
  'top10',
  'continue',
  'schedule',
  'latest',
  'vfx',
  'usuk-series',
  'action',
  'scifi',
  'horror',
  'historical',
  'theatrical'
]::TEXT[];

UPDATE "site_configuration"
SET "homeSectionOrder" =
  "homeSectionOrder"
  || CASE
    WHEN NOT ('horror' = ANY("homeSectionOrder")) THEN ARRAY['horror']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END
  || CASE
    WHEN NOT ('historical' = ANY("homeSectionOrder")) THEN ARRAY['historical']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END
  || CASE
    WHEN NOT ('theatrical' = ANY("homeSectionOrder")) THEN ARRAY['theatrical']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END
WHERE
  NOT ('horror' = ANY("homeSectionOrder"))
  OR NOT ('historical' = ANY("homeSectionOrder"))
  OR NOT ('theatrical' = ANY("homeSectionOrder"));
