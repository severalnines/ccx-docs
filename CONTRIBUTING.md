# Contributing guide

* All documentation files must be written in markdown format under the `docs` directory. File name should be suffixed with `.md`.
* A basic markdown syntax can be found here: https://www.markdownguide.org/basic-syntax/

## Docusaurus-MkDocs compatibility guide

Please follow this compatibility guide to make sure the conversion from Docusaurus to MkDocs does not break. This guide is also following the best practice in Markdown formatting. Please maintain consistency in writing documentation.

### Headings hierarchy

- You must use heading 1 only once (# example title) at the beginning of an article, followed by heading 2 (## example title). Do not use heading 1 twice in an article. Only heading 2 and greater will be listed in the table of content of MkDocs on the right side of an article. Having two or more heading 1 in an article will result to table of content missing.

### List/Numbering

- You must give a blank line before a list/numbering/bullet point. Example:

```
This is my list:

- point 1
- point 2
```

Do NOT do this:

```
This is my list:
- point 1
- point 2
```

### Admonition

- You must enclose your admonition with `:::` and `:::` on different lines. Example:

```
:::danger

Some **content** with _Markdown_ `syntax`. Check [this `api`](#).

:::
```

Do NOT do this:

```
:::danger Some **content** with _Markdown_ `syntax`. Check [this `api`](#). :::
```


### Relative path linking

- Use relative linking with file name everywhere. This type of linking will also work in GitHub repository.

Example:

```
For more info, see [Observability](../../Observability.md)
```

Do NOT use absolute path:

```
For more info, see [Observability](/docs/admin/Observability.md)
```

Do NOT use folder path:

```
For more info, see [Observability](/docs/admin/Observability)
```

Docusaurus also recommends using relative file paths instead. See https://docusaurus.io/docs/markdown-features/links .
