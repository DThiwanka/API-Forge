import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Step 62: Accessibility & Responsive UX Polish', () => {
  describe('1. Global Accessibility Styles & Motion Support', () => {
    const cssPath = path.join(srcDir, 'styles/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    it('should declare a high-contrast visible focus ring for keyboard navigation', () => {
      assert.ok(
        cssContent.includes(':focus-visible'),
        'index.css should define :focus-visible rules'
      );
      assert.ok(
        cssContent.includes('outline:') || cssContent.includes('outline-offset:'),
        'index.css should define outline or outline-offset for focus visible'
      );
    });

    it('should provide skip-to-content bypass utility styles', () => {
      assert.ok(
        cssContent.includes('.skip-to-content'),
        'index.css should define .skip-to-content class'
      );
      assert.ok(
        cssContent.includes('.skip-to-content:focus'),
        'index.css should define .skip-to-content:focus visible rule'
      );
    });

    it('should implement prefers-reduced-motion media query to respect vestibular preferences', () => {
      assert.ok(
        cssContent.includes('@media (prefers-reduced-motion: reduce)'),
        'index.css should include prefers-reduced-motion media block'
      );
      assert.ok(
        cssContent.includes('animation-duration: 0.01ms') ||
        cssContent.includes('transition-duration: 0.01ms') ||
        cssContent.includes('scroll-behavior: auto'),
        'index.css prefers-reduced-motion should suppress animations and smooth scroll'
      );
    });
  });

  describe('2. Shell, Skip Links, and Landmark Semantics', () => {
    const appShellPath = path.join(srcDir, 'components/layout/AppShell.jsx');
    const appShellContent = fs.readFileSync(appShellPath, 'utf8');

    it('should render a skip-to-content link targeting #main-content', () => {
      assert.ok(
        appShellContent.includes('href="#main-content"'),
        'AppShell should include skip link pointing to #main-content'
      );
      assert.ok(
        appShellContent.includes('skip-to-content'),
        'AppShell skip link should use skip-to-content styling class'
      );
      assert.ok(
        appShellContent.includes('id="main-content"'),
        'AppShell main landmark should have id="main-content"'
      );
    });

    const topBarPath = path.join(srcDir, 'components/layout/TopBar.jsx');
    const topBarContent = fs.readFileSync(topBarPath, 'utf8');

    it('should provide accessible user account menu controls and mobile Command Center trigger', () => {
      assert.ok(
        topBarContent.includes('aria-haspopup="menu"'),
        'TopBar user menu should declare aria-haspopup="menu"'
      );
      assert.ok(
        topBarContent.includes('aria-expanded='),
        'TopBar user menu should indicate aria-expanded state'
      );
      assert.ok(
        topBarContent.includes('role="menu"'),
        'TopBar dropdown should declare role="menu"'
      );
      assert.ok(
        topBarContent.includes('Open Command Center ('),
        'TopBar should provide mobile button for Command Center with descriptive label'
      );
    });

    const workspaceHeaderPath = path.join(srcDir, 'components/layout/WorkspaceHeader.jsx');
    const workspaceHeaderContent = fs.readFileSync(workspaceHeaderPath, 'utf8');

    it('should define navigation landmarks and accessible labels in WorkspaceHeader', () => {
      assert.ok(
        workspaceHeaderContent.includes('aria-label="Workspace views"'),
        'WorkspaceHeader should label views nav with aria-label'
      );
      assert.ok(
        workspaceHeaderContent.includes('aria-current='),
        'WorkspaceHeader view links should indicate active state with aria-current'
      );
      assert.ok(
        workspaceHeaderContent.includes('aria-expanded='),
        'WorkspaceHeader sidebar toggle should indicate expanded state'
      );
    });
  });

  describe('3. Core Primitives (Dialog, Tabs, Switch)', () => {
    const dialogPath = path.join(srcDir, 'components/ui/Dialog.jsx');
    const dialogContent = fs.readFileSync(dialogPath, 'utf8');

    it('should implement modal dialog accessibility with focus trapping and aria linkage', () => {
      assert.ok(
        dialogContent.includes('role="dialog"'),
        'Dialog should have role="dialog"'
      );
      assert.ok(
        dialogContent.includes('aria-modal="true"'),
        'Dialog should have aria-modal="true"'
      );
      assert.ok(
        dialogContent.includes('aria-labelledby='),
        'Dialog should link title via aria-labelledby'
      );
      assert.ok(
        dialogContent.includes('aria-label="Close dialog"'),
        'Dialog close button should have explicit aria-label'
      );
      assert.ok(
        dialogContent.includes("e.key === 'Tab'") && dialogContent.includes('shiftKey'),
        'Dialog should trap keyboard tab focus'
      );
    });

    const tabsPath = path.join(srcDir, 'components/ui/Tabs.jsx');
    const tabsContent = fs.readFileSync(tabsPath, 'utf8');

    it('should conform to WAI-ARIA Tabs pattern with arrow-key keyboard navigation', () => {
      assert.ok(
        tabsContent.includes('role="tablist"'),
        'Tabs should declare role="tablist"'
      );
      assert.ok(
        tabsContent.includes('role="tab"'),
        'Tab triggers should declare role="tab"'
      );
      assert.ok(
        tabsContent.includes('aria-selected='),
        'Tab triggers should declare aria-selected'
      );
      assert.ok(
        tabsContent.includes('aria-controls='),
        'Tab triggers should link to panel with aria-controls'
      );
      assert.ok(
        tabsContent.includes('ArrowRight') && tabsContent.includes('ArrowLeft'),
        'Tabs should support arrow navigation'
      );
    });

    const switchPath = path.join(srcDir, 'components/ui/Switch.jsx');
    const switchContent = fs.readFileSync(switchPath, 'utf8');

    it('should implement accessible switch component without double-bubble label issues', () => {
      assert.ok(
        switchContent.includes('role="switch"'),
        'Switch should declare role="switch"'
      );
      assert.ok(
        switchContent.includes('aria-checked='),
        'Switch should declare aria-checked'
      );
      assert.ok(
        !switchContent.includes('<label className="inline-flex'),
        'Switch outer container should not be a wrapper label to avoid double toggle clicks'
      );
    });
  });

  describe('4. Collection Tree & Request Tab Accessibility', () => {
    const collItemPath = path.join(srcDir, 'features/collections/components/CollectionItem.jsx');
    const collItemContent = fs.readFileSync(collItemPath, 'utf8');

    const folderItemPath = path.join(srcDir, 'features/collections/components/FolderItem.jsx');
    const folderItemContent = fs.readFileSync(folderItemPath, 'utf8');

    const reqItemPath = path.join(srcDir, 'features/collections/components/RequestItem.jsx');
    const reqItemContent = fs.readFileSync(reqItemPath, 'utf8');

    it('should provide treeitem semantics, aria-expanded, and hierarchical level attributes', () => {
      assert.ok(collItemContent.includes('role="treeitem"'), 'CollectionItem should have role="treeitem"');
      assert.ok(collItemContent.includes('aria-expanded='), 'CollectionItem should have aria-expanded');
      assert.ok(collItemContent.includes('aria-level={1}'), 'CollectionItem should have aria-level=1');

      assert.ok(folderItemContent.includes('role="treeitem"'), 'FolderItem should have role="treeitem"');
      assert.ok(folderItemContent.includes('aria-expanded='), 'FolderItem should have aria-expanded');
      assert.ok(folderItemContent.includes('aria-level={depth + 1}'), 'FolderItem should have calculated aria-level');

      assert.ok(reqItemContent.includes('role="treeitem"'), 'RequestItem should have role="treeitem"');
      assert.ok(reqItemContent.includes('aria-selected='), 'RequestItem should have aria-selected');
      assert.ok(reqItemContent.includes('aria-level={depth + 2}'), 'RequestItem should have calculated aria-level');
    });

    const reqTabBarPath = path.join(srcDir, 'features/requests/components/RequestTabBar.jsx');
    const reqTabBarContent = fs.readFileSync(reqTabBarPath, 'utf8');

    it('should announce unsaved dirty changes and provide accessible tab closing', () => {
      assert.ok(
        reqTabBarContent.includes('role="tablist"'),
        'RequestTabBar should declare role="tablist"'
      );
      assert.ok(
        reqTabBarContent.includes('sr-only') && reqTabBarContent.includes('unsaved'),
        'RequestTabBar should provide visually hidden unsaved text for screen readers'
      );
      assert.ok(
        reqTabBarContent.includes('aria-label={`Close ${tab.title ||'),
        'RequestTabBar close button should have explicit aria-label with tab title'
      );
    });
  });

  describe('5. Forms, Errors & Accessible Feedback', () => {
    const loginPath = path.join(srcDir, 'pages/Login.jsx');
    const loginContent = fs.readFileSync(loginPath, 'utf8');

    it('should associate login form labels with inputs and announce errors with role="alert"', () => {
      assert.ok(loginContent.includes('htmlFor="login-email"'), 'Login should have htmlFor for email');
      assert.ok(loginContent.includes('id="login-email"'), 'Login should have id for email input');
      assert.ok(loginContent.includes('htmlFor="login-password"'), 'Login should have htmlFor for password');
      assert.ok(loginContent.includes('id="login-password"'), 'Login should have id for password input');
      assert.ok(loginContent.includes('role="alert"'), 'Login error banner should have role="alert"');
      assert.ok(loginContent.includes('aria-invalid='), 'Login form should support aria-invalid');
    });

    const createReqPath = path.join(srcDir, 'features/collections/components/CreateRequestDialog.jsx');
    const createReqContent = fs.readFileSync(createReqPath, 'utf8');

    it('should link CreateRequestDialog inputs to labels and announce errors via alert role', () => {
      assert.ok(createReqContent.includes('htmlFor="create-req-name"'), 'CreateRequestDialog should have htmlFor="create-req-name"');
      assert.ok(createReqContent.includes('id="create-req-name"'), 'CreateRequestDialog should have id="create-req-name"');
      assert.ok(createReqContent.includes('role="alert"'), 'CreateRequestDialog error should have role="alert"');
    });

    const createColPath = path.join(srcDir, 'features/collections/components/CreateCollectionDialog.jsx');
    const createColContent = fs.readFileSync(createColPath, 'utf8');

    it('should link CreateCollectionDialog inputs to labels and announce errors via alert role', () => {
      assert.ok(createColContent.includes('htmlFor="create-collection-name"'), 'CreateCollectionDialog should have htmlFor');
      assert.ok(createColContent.includes('id="create-collection-name"'), 'CreateCollectionDialog should have id');
      assert.ok(createColContent.includes('role="alert"'), 'CreateCollectionDialog error should have role="alert"');
    });
  });

  describe('6. Response Status & Canvas Accessibility', () => {
    const statusPath = path.join(srcDir, 'features/response/components/ResponseStatus.jsx');
    const statusContent = fs.readFileSync(statusPath, 'utf8');

    it('should declare role="status" and clear textual status labels in ResponseStatus', () => {
      assert.ok(statusContent.includes('role="status"'), 'ResponseStatus should have role="status"');
      assert.ok(
        statusContent.includes('aria-label={`Status: ${status}'),
        'ResponseStatus should have explicit status aria-label'
      );
    });

    const requestNodePath = path.join(srcDir, 'features/canvas/components/RequestNode.jsx');
    const requestNodeContent = fs.readFileSync(requestNodePath, 'utf8');

    it('should make canvas nodes keyboard focusable and actionable', () => {
      assert.ok(requestNodeContent.includes('tabIndex={0}'), 'RequestNode should have tabIndex={0}');
      assert.ok(requestNodeContent.includes('role="article"'), 'RequestNode should have role="article"');
      assert.ok(
        requestNodeContent.includes('onKeyDown='),
        'RequestNode should handle keyboard activation'
      );
    });
  });
});

