# Markdown Viewer

[English](README.md) | **한국어**

Markdown Viewer는 마크다운 파일을 읽기 전용으로 여는 오픈소스 앱입니다. Windows 설치 프로그램과 브라우저 버전을 제공합니다. 기본 언어는 영어이며 화면에서 한국어로 바꿀 수 있습니다. 문서는 기기에서 처리하고 서버로 전송하지 않습니다.

## Windows에 설치

[GitHub Releases](https://github.com/jwjp/markdown-viewer/releases)에서 `-setup.exe` 설치 파일을 받으세요. Windows 10/11과 WebView2가 필요합니다. 설치하면 `.md`, `.markdown` 파일의 **연결 프로그램** 목록에 Markdown Viewer가 추가됩니다. 기존 기본 앱은 유지됩니다. 기본 뷰어로 지정하려면 `.md` 파일을 마우스 오른쪽 버튼으로 클릭한 뒤 **연결 프로그램 → 다른 앱 선택 → Markdown Viewer**를 선택하고 **항상**을 누르세요. 이후 파일을 더블클릭하면 새 뷰어 창에서 열립니다.

현재 설치 파일에는 코드 서명이 없어 Windows SmartScreen 경고가 나타날 수 있습니다. 실행 전에 다운로드 출처를 확인하세요.

## 기능

- 표, 작업 목록, 취소선, 코드 블록, 링크, 문서 폴더의 이미지를 포함한 마크다운 읽기
- 제목 목차, 본문과 원문 검색, 원문 보기
- 밝은/어두운 테마 및 영어/한국어 전환
- 파일 선택, 끌어 놓기, Windows 탐색기에서 열기
- 계정과 원격 분석 없이 오프라인으로 사용
- Windows 앱에서 새 버전을 확인하고 검증된 업데이트 설치

마크다운의 HTML은 텍스트로 표시합니다. 원격 이미지는 불러오지 않습니다. Windows 앱은 열린 문서 폴더 안의 PNG, JPEG, GIF, WebP 이미지를 표시합니다. 브라우저의 파일 선택 기능은 주변 이미지 파일에 접근할 수 없어 이미지 대체 텍스트를 표시합니다. 문서는 UTF-8이며 최대 10 MB, 로컬 이미지는 각각 최대 8 MB입니다.

## 앱 업데이트

설치된 Windows 앱은 시작할 때 GitHub Releases에서 새 버전을 확인합니다. **업데이트 확인** 버튼으로 다시 확인할 수 있습니다. 새 버전이 있으면 다운로드하고 업데이트 서명을 검증한 뒤 **업데이트 설치** 버튼을 표시합니다. Windows 설치 프로그램이 업데이트를 마치고 앱을 다시 시작합니다. 마크다운 문서는 기기에 그대로 있으며, 업데이트 확인 시 GitHub에 문서를 업로드하지 않습니다.

버전 0.1.0에는 업데이트 기능이 없습니다. 먼저 GitHub Releases에서 0.1.1 이상을 한 번 설치해야 이후 버전을 앱 안에서 업데이트할 수 있습니다. 업데이트 서명과 Windows 코드 서명은 별개이므로, 코드 서명이 없는 설치 파일에는 여전히 SmartScreen 경고가 표시될 수 있습니다.

## 브라우저 버전

`docs/index.html`을 열거나 [웹 뷰어](https://jwjp.github.io/markdown-viewer/)를 사용하세요. 로컬 서버를 실행하려면:

```sh
python -m http.server 8000 --directory docs
```

## 직접 빌드

Node.js, Rust MSVC 도구 모음, Microsoft C++ Build Tools, WebView2를 설치한 뒤 실행하세요.

```sh
npm ci
npm run desktop:build
```

NSIS 설치 파일은 `src-tauri/target/release/bundle/nsis/`에 생성됩니다. 이 로컬 빌드는 업데이트 서명을 만들지 않습니다. 의존성을 업데이트했다면 `npm run vendor`로 저장소에 포함된 브라우저 번들을 갱신하세요. Pillow가 있으면 `python scripts/generate-icons.py`로 아이콘을 다시 만들 수 있습니다.

## 업데이트 배포

`package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`의 버전을 같게 유지하세요. 업데이트 서명 공개 키는 Tauri 설정에 들어 있습니다. 개인 키는 저장소 밖의 `%USERPROFILE%\.tauri\markdown-viewer.key`와 GitHub Actions의 `TAURI_SIGNING_PRIVATE_KEY` 시크릿에 있습니다. 개인 키를 안전하게 백업하세요. 잃어버리면 기존 설치 앱이 이후 업데이트를 신뢰할 수 없습니다. 저장소에 올리지 마세요.

로컬 서명 빌드는 `./scripts/build-release.ps1`로 만들 수 있습니다. `v<version>` 태그를 푸시하면 Windows 릴리스 워크플로가 설치 파일, `.sig`, `latest.json`, SHA-256 체크섬을 GitHub Releases에 게시합니다. 앱은 최신 릴리스의 `latest.json`을 읽습니다.

## 개발과 기여

화면 코드는 `docs/`, Tauri 명령과 설치 설정은 `src-tauri/`에 있습니다. `src-tauri/windows/installer.nsi`는 Tauri 2.11.5 NSIS 템플릿을 바탕으로 합니다. Tauri CLI를 올릴 때 함께 검토하세요. 재현 가능한 문제와 개선 사항은 Pull Request로 보내주세요. 코드 주석과 기본 문서는 영어로 작성하고 사용자 기능이 바뀌면 한국어 README도 갱신해 주세요.

마크다운 렌더링에는 [markdown-it](https://github.com/markdown-it/markdown-it)과 [DOMPurify](https://github.com/cure53/DOMPurify)를 사용합니다. 라이선스 고지는 `docs/vendor/`에 있습니다.

## 라이선스

MIT. [LICENSE](LICENSE)를 참고하세요.
