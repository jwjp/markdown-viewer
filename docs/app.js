(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const desktop = Boolean(window.__TAURI__?.core?.invoke);
  const invoke = window.__TAURI__?.core?.invoke;
  const words = {
    en: {
      private: 'Local only', theme: 'Toggle theme', open: 'Open file', preview: 'Preview', source: 'Source',
      search: 'Find in document', outline: 'Outline', onThisPage: 'On this page', eyebrow: 'A clear place to read',
      welcomeTitle: 'Your Markdown, beautifully readable.', welcomeCopy: 'Open a .md file or drop it here. Your document stays on this device.',
      choose: 'Choose a Markdown file', formats: 'Supports .md and .markdown · UTF-8 · Up to 10 MB',
      drop: 'Drop Markdown file to open', invalid: 'Choose a .md or .markdown file.', large: 'The document exceeds the 10 MB limit.',
      encoding: 'This document is not UTF-8 encoded.', emptyOutline: 'No headings in this document',
      noMatches: 'No matches', imageUnavailable: 'Image unavailable', words: 'words', lines: 'lines'
    },
    ko: {
      private: '내 기기에서만', theme: '테마 전환', open: '파일 열기', preview: '미리보기', source: '원문',
      search: '문서에서 찾기', outline: '목차', onThisPage: '이 문서의 목차', eyebrow: '읽기에 집중하는 공간',
      welcomeTitle: '마크다운을 편안하게 읽으세요.', welcomeCopy: '.md 파일을 열거나 여기에 끌어 놓으세요. 문서는 기기 밖으로 전송되지 않습니다.',
      choose: '마크다운 파일 선택', formats: '.md 및 .markdown · UTF-8 · 최대 10 MB',
      drop: '마크다운 파일을 놓아 여세요', invalid: '.md 또는 .markdown 파일을 선택하세요.', large: '문서 크기가 10 MB를 초과합니다.',
      encoding: 'UTF-8로 인코딩된 문서가 아닙니다.', emptyOutline: '이 문서에는 제목이 없습니다',
      noMatches: '검색 결과 없음', imageUnavailable: '이미지를 표시할 수 없음', words: '단어', lines: '줄'
    }
  };

  let language = localStorage.getItem('markdown-viewer-language') === 'ko' ? 'ko' : 'en';
  let mode = 'preview';
  let documentData = null;
  let outlineVisible = matchMedia('(min-width: 801px)').matches;
  let renderVersion = 0;
  let marks = [];
  let markIndex = -1;
  let toastTimer;
  let dragDepth = 0;

  const markdown = window.markdownit({ html: false, linkify: true, typographer: false });
  markdown.core.ruler.after('inline', 'task-list', (state) => {
    for (let index = 0; index < state.tokens.length - 2; index++) {
      const current = state.tokens[index];
      if (current.type !== 'list_item_open' || state.tokens[index + 1].type !== 'paragraph_open') continue;
      const inline = state.tokens[index + 2];
      const first = inline.children?.[0];
      const match = first?.type === 'text' && /^\[([ xX])\]\s+/.exec(first.content);
      if (!match) continue;
      current.attrJoin('class', 'task-list-item');
      first.content = first.content.slice(match[0].length);
      const checkbox = new state.Token('html_inline', '', 0);
      checkbox.content = `<input type="checkbox" disabled${match[1].toLowerCase() === 'x' ? ' checked' : ''} aria-label="Task"> `;
      inline.children.unshift(checkbox);
    }
  });
  markdown.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const source = token.attrGet('src') || '';
    const alt = self.renderInlineAsText(token.children || [], options, env);
    const title = token.attrGet('title') || '';
    // Images are loaded only from the opened document's folder by the desktop backend.
    if (/^(?:[a-z][a-z\d+.-]*:|\/|\\|#)/i.test(source)) {
      return `<span class="image-alt">${markdown.utils.escapeHtml(alt)}</span>`;
    }
    return `<img data-local-src="${markdown.utils.escapeHtml(source)}" alt="${markdown.utils.escapeHtml(alt)}" title="${markdown.utils.escapeHtml(title)}" loading="lazy">`;
  };

  const linkDefault = markdown.renderer.rules.link_open || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));
  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const href = token.attrGet('href') || '';
    if (href && !/^(?:https?:|mailto:|#)/i.test(href)) {
      token.attrSet('data-local-href', href);
      token.attrSet('href', '#');
    }
    return linkDefault(tokens, index, options, env, self);
  };

  function t(key) { return words[language][key]; }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
  }

  function setLanguage(value) {
    language = value === 'ko' ? 'ko' : 'en';
    localStorage.setItem('markdown-viewer-language', language);
    document.documentElement.lang = language;
    $('languageSelect').value = language;
    document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.title = t(element.dataset.i18nTitle);
      element.setAttribute('aria-label', t(element.dataset.i18nTitle));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
    if (documentData) { buildOutline(); updateFooter(); updateSearchCount(); }
  }

  function setTheme(value) {
    document.documentElement.dataset.theme = value;
    localStorage.setItem('markdown-viewer-theme', value);
  }

  function setMode(value) {
    mode = value;
    $('preview').hidden = value !== 'preview';
    $('source').hidden = value !== 'source';
    $('previewButton').classList.toggle('selected', value === 'preview');
    $('sourceButton').classList.toggle('selected', value === 'source');
    $('outlinePanel').hidden = value !== 'preview' || !outlineVisible;
    $('outlineButton').hidden = value !== 'preview';
    $('documentScroller').scrollTop = 0;
    runSearch();
  }

  function updateFooter() {
    if (!documentData) return;
    const lineCount = documentData.text.split(/\r\n|\r|\n/).length;
    const wordCount = documentData.text.trim() ? documentData.text.trim().split(/\s+/u).length : 0;
    $('documentFooter').textContent = `${lineCount.toLocaleString()} ${t('lines')} · ${wordCount.toLocaleString()} ${t('words')}`;
  }

  function buildOutline() {
    const list = $('outlineList');
    list.replaceChildren();
    const headings = $('preview').querySelectorAll('h1,h2,h3,h4,h5,h6');
    if (!headings.length) {
      const empty = document.createElement('span');
      empty.className = 'outline-empty';
      empty.textContent = t('emptyOutline');
      list.append(empty);
      return;
    }
    headings.forEach((heading, index) => {
      heading.id = `heading-${index + 1}`;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.className = `level-${heading.tagName.substring(1)}`;
      link.textContent = heading.textContent;
      link.title = heading.textContent;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        list.querySelectorAll('a').forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
        if (matchMedia('(max-width: 800px)').matches) { outlineVisible = false; $('outlinePanel').hidden = true; }
      });
      list.append(link);
    });
  }

  async function loadImages(version) {
    for (const image of $('preview').querySelectorAll('img[data-local-src]')) {
      if (version !== renderVersion) return;
      const source = image.dataset.localSrc;
      if (!desktop || !documentData.path || !source) {
        image.replaceWith(document.createTextNode(image.alt || t('imageUnavailable')));
        continue;
      }
      try {
        image.src = await invoke('read_relative_image', { documentPath: documentData.path, imagePath: decodeURIComponent(source.split(/[?#]/)[0]) });
      } catch {
        image.replaceWith(document.createTextNode(image.alt || t('imageUnavailable')));
      }
    }
  }

  function renderDocument(data) {
    documentData = data;
    const version = ++renderVersion;
    $('fileName').textContent = data.name;
    $('fileName').title = data.path || data.name;
    document.title = `${data.name} — Markdown Viewer`;
    $('welcome').hidden = true;
    $('reader').hidden = false;
    $('toolbar').hidden = false;
    $('sourceText').textContent = data.text;
    const safe = DOMPurify.sanitize(markdown.render(data.text), {
      USE_PROFILES: { html: true },
      FORBID_ATTR: ['style'],
      RETURN_DOM_FRAGMENT: true
    });
    $('preview').replaceChildren(safe);
    buildOutline();
    updateFooter();
    setMode(mode);
    $('searchInput').value = '';
    runSearch();
    loadImages(version);
  }

  function validateName(name, size) {
    if (!/\.(md|markdown)$/i.test(name)) throw new Error(t('invalid'));
    if (size > 10 * 1024 * 1024) throw new Error(t('large'));
  }

  async function openBrowserFile(file) {
    if (!file) return;
    try {
      validateName(file.name, file.size);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()).replace(/^\uFEFF/, '');
      renderDocument({ name: file.name, path: null, text });
    } catch (error) { showToast(error instanceof TypeError ? t('encoding') : String(error.message || error)); }
  }

  async function openPath(path) {
    try { renderDocument(await invoke('read_document', { path })); }
    catch (error) { showToast(String(error)); }
  }

  async function chooseFile() {
    if (desktop && window.__TAURI__.dialog?.open) {
      try {
        const path = await window.__TAURI__.dialog.open({ multiple: false, directory: false, filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }] });
        if (path) await openPath(path);
      } catch (error) { showToast(String(error)); }
    } else {
      $('fileInput').click();
    }
  }

  function clearMarks() {
    for (const mark of marks) {
      if (!mark.isConnected) continue;
      const parent = mark.parentNode;
      mark.replaceWith(document.createTextNode(mark.textContent));
      parent.normalize();
    }
    marks = [];
    markIndex = -1;
  }

  function updateSearchCount() {
    const count = $('searchCount');
    count.textContent = marks.length ? `${markIndex + 1}/${marks.length}` : ($('searchInput').value ? t('noMatches') : '');
  }

  function jumpToMark(index) {
    if (!marks.length) return;
    marks.forEach((mark) => mark.classList.remove('current'));
    markIndex = (index + marks.length) % marks.length;
    marks[markIndex].classList.add('current');
    marks[markIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateSearchCount();
  }

  function runSearch() {
    clearMarks();
    const query = $('searchInput').value.trim();
    if (!query || !documentData) { updateSearchCount(); return; }
    const root = mode === 'preview' ? $('preview') : $('sourceText');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement.closest('script,style,mark') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const needle = query.toLocaleLowerCase();
    for (const node of nodes) {
      const content = node.nodeValue;
      const lower = content.toLocaleLowerCase();
      let start = 0;
      let found = lower.indexOf(needle, start);
      if (found === -1) continue;
      const fragment = document.createDocumentFragment();
      while (found !== -1) {
        fragment.append(document.createTextNode(content.slice(start, found)));
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = content.slice(found, found + query.length);
        fragment.append(mark);
        marks.push(mark);
        start = found + query.length;
        found = lower.indexOf(needle, start);
      }
      fragment.append(document.createTextNode(content.slice(start)));
      node.replaceWith(fragment);
    }
    if (marks.length) jumpToMark(0);
    else updateSearchCount();
  }

  async function handleLink(event) {
    const link = event.target.closest('a');
    if (!link || !$('preview').contains(link)) return;
    const local = link.dataset.localHref;
    if (local) {
      event.preventDefault();
      if (!desktop || !documentData?.path) return;
      const target = decodeURIComponent(local.split('#')[0]);
      if (!/\.(md|markdown)$/i.test(target)) return;
      const separator = documentData.path.includes('\\') ? '\\' : '/';
      const base = documentData.path.slice(0, documentData.path.lastIndexOf(separator) + 1);
      await openPath(base + target.replaceAll('/', separator));
      return;
    }
    const href = link.getAttribute('href');
    if (href?.startsWith('#')) {
      event.preventDefault();
      const slug = decodeURIComponent(href.slice(1)).toLowerCase();
      const heading = [...$('preview').querySelectorAll('h1,h2,h3,h4,h5,h6')].find((item) => item.id === slug || item.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') === slug);
      heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (href && /^https?:\/\//i.test(href)) {
      event.preventDefault();
      if (desktop) {
        try { await window.__TAURI__.opener.openUrl(href); }
        catch (error) { showToast(String(error)); }
      } else window.open(href, '_blank', 'noopener,noreferrer');
    } else event.preventDefault();
  }

  $('openButton').addEventListener('click', chooseFile);
  $('welcomeOpenButton').addEventListener('click', chooseFile);
  $('fileInput').addEventListener('change', (event) => { openBrowserFile(event.target.files?.[0]); event.target.value = ''; });
  $('languageSelect').addEventListener('change', (event) => setLanguage(event.target.value));
  $('themeButton').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('previewButton').addEventListener('click', () => setMode('preview'));
  $('sourceButton').addEventListener('click', () => setMode('source'));
  $('outlineButton').addEventListener('click', () => { outlineVisible = !outlineVisible; $('outlinePanel').hidden = !outlineVisible; });
  $('searchInput').addEventListener('input', runSearch);
  $('searchInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); jumpToMark(markIndex + (event.shiftKey ? -1 : 1)); } });
  $('previousButton').addEventListener('click', () => jumpToMark(markIndex - 1));
  $('nextButton').addEventListener('click', () => jumpToMark(markIndex + 1));
  $('preview').addEventListener('click', handleLink);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); chooseFile(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && documentData) { event.preventDefault(); $('searchInput').focus(); $('searchInput').select(); }
    if (event.key === 'Escape') { $('searchInput').blur(); $('dropOverlay').hidden = true; }
  });
  if (desktop && window.__TAURI__.webview?.getCurrentWebview) {
    window.__TAURI__.webview.getCurrentWebview().onDragDropEvent((event) => {
      const payload = event.payload;
      if (payload.type === 'enter' || payload.type === 'over') $('dropOverlay').hidden = false;
      if (payload.type === 'leave' || payload.type === 'drop') $('dropOverlay').hidden = true;
      if (payload.type === 'drop' && payload.paths[0]) openPath(payload.paths[0]);
    }).catch((error) => showToast(String(error)));
  } else {
    document.addEventListener('dragenter', (event) => { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); dragDepth++; $('dropOverlay').hidden = false; } });
    document.addEventListener('dragover', (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
    document.addEventListener('dragleave', (event) => { event.preventDefault(); dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('dropOverlay').hidden = true; });
    document.addEventListener('drop', (event) => { event.preventDefault(); dragDepth = 0; $('dropOverlay').hidden = true; openBrowserFile(event.dataTransfer?.files?.[0]); });
  }

  setTheme(localStorage.getItem('markdown-viewer-theme') === 'dark' ? 'dark' : 'light');
  setLanguage(language);
  if (desktop) invoke('startup_document').then((data) => { if (data) renderDocument(data); }).catch((error) => showToast(String(error)));
})();
