# jsDelivr for FlexPhim decorative assets

FlexPhim only delegates non-critical artwork to this CDN. Posters, hero artwork,
logos and playback resources remain on their existing delivery paths.

## Asset layout

Publish the paths listed in
`apps/web/public/config/decorative-assets.json` to a **public** GitHub repository
or npm package while preserving the `images/`, `avatars/` and `config/`
directories.

Use an immutable commit SHA or package version, never `@main` or `@latest`:

```env
NEXT_PUBLIC_DECORATIVE_ASSET_CDN_BASE_URL=https://cdn.jsdelivr.net/gh/OWNER/PUBLIC_ASSET_REPO@COMMIT/public
```

Test one asset before deployment:

```text
https://cdn.jsdelivr.net/gh/OWNER/PUBLIC_ASSET_REPO@COMMIT/public/images/cat1-thumbnail.webp
```

The current `huywashere/film-site` repository is private, so jsDelivr returns
404 for its GitHub URLs. Keep the variable empty until the selected asset
repository/package is public. When empty or unreachable, FlexPhim uses the local
copy in `apps/web/public` automatically.
