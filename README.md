# Markdown Viewer

**English** | [한국어](README.ko.md)

Markdown Viewer is an open-source, read-only app for opening Markdown files. It has a Windows installer and a browser version. The interface starts in English and can be switched to Korean. Documents are processed locally and are never uploaded.

## Install on Windows

Download the `-setup.exe` installer from [GitHub Releases](https://github.com/jwjp/markdown-viewer/releases). Windows 10/11 and WebView2 are required. The installer adds Markdown Viewer to **Open with** for `.md` and `.markdown`; it does not replace your existing default app. To make it the default, right-click an `.md` file, choose **Open with → Choose another app → Markdown Viewer**, and select **Always**. Double-clicking a Markdown file then opens it in a new viewer window.

The installer is currently unsigned, so Windows SmartScreen may display a warning. Verify the download source before running it.

## Features

- Read CommonMark-style Markdown with tables, task lists, strikethrough, code blocks, links, and images in the document folder
- Navigate with a heading outline, search the rendered page or source, and switch to source view
- Switch between light and dark themes and English and Korean
- Open a file through the picker, drag and drop, or Windows Explorer
- Read documents offline with no account or telemetry

Raw HTML in Markdown is displayed as text. Remote images are not loaded. Local PNG, JPEG, GIF, and WebP images are available in the Windows app when they are inside the opened document's folder. Browser file selection cannot grant access to neighboring image files, so it shows image alt text instead. Files must be UTF-8 and at most 10 MB; local images are limited to 8 MB each.

## Browser version

Open `docs/index.html` or visit [the web viewer](https://jwjp.github.io/markdown-viewer/). To serve it locally:

```sh
python -m http.server 8000 --directory docs
```

## Build

Install Node.js, the Rust MSVC toolchain, Microsoft C++ Build Tools, and WebView2, then run:

```sh
npm ci
npm run desktop:build
```

The NSIS installer is written to `src-tauri/target/release/bundle/nsis/`. `npm run vendor` refreshes the committed browser bundles after updating dependencies. `python scripts/generate-icons.py` regenerates icons if Pillow is installed.

## Development

The interface lives in `docs/`. Tauri commands and installer settings live in `src-tauri/`. `src-tauri/windows/installer.nsi` is based on the Tauri 2.11.5 NSIS template; review it when upgrading the Tauri CLI. Open a pull request with a reproducible issue or improvement. Please write code comments and primary docs in English and update the Korean README for user-facing changes.

Markdown rendering uses [markdown-it](https://github.com/markdown-it/markdown-it) and [DOMPurify](https://github.com/cure53/DOMPurify). Their license notices are in `docs/vendor/`.

## License

MIT. See [LICENSE](LICENSE).
