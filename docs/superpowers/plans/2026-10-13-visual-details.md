# Visual Details Implementation Plan

> **For agentic workers:** Execute inline using the existing isolated clone; user authorized these four visual improvements. Steps use checkbox syntax for tracking.

**Goal:** 完成用户确认的四项界面精修，保持原沉浸信息流和设置内分类。

**Architecture:** 在现有 index.html 上定向替换主题变量、纸张样式及点赞实现，设置仅重新组织现有控件。使用独立 SVG ID 和按钮内局部动画，持久化继续使用原键。

**Tech Stack:** HTML, CSS, SVG, JavaScript, Web Animations API, Playwright browser verification.

---

### Task 1: Theme and settings

Modify `index.html`: update dark tokens and theme-color; replace me-panel with grouped settings; preserve existing IDs/listeners. Font summary displays `FONT_MAP[Store.getFontPref()]?.name || '跟随主题'`; `applyFontSize` disables decrement at 14 and increment at 24. Selection buttons synchronize aria-pressed. Keep feed markup intact.

- [ ] Update theme tokens and theme-color.
- [ ] Organize existing settings rows, use details/summary for font selection, update selected summaries and disabled font buttons.
- [ ] Inspect mobile settings at 320 and 390 pixels and confirm all original options remain available.

### Task 2: Notebook material

Modify `index.html`: use `--paper-rule-height: max(32px, calc(var(--joke-font-size) * 1.85))`. Main repeats ruled lines at this height. Paper text line-height equals the variable; card padding-top equals one rule and footer height equals two rules, text bottom margin 0. Thus every text card height is an integer number of rule periods. Exclude setting form from horizontal paper rules.

- [ ] Replace rough yellow texture and borders with light paper, subtle inline SVG texture and spine shading.
- [ ] Align card padding/line-height/footer to the shared rule height.
- [ ] Inspect long and short content at 14/17/24px.

### Task 3: Like animation

Modify `index.html`: `createHeartIcon()` returns SVG with unique gradient/clip IDs and two paths; fill clip moves from translateY(24px) to 0 when active. `syncLikeButton(btn, active)` updates class, aria-pressed and accessible label. A WeakMap stores animation handles for each button; `stopLikeAnimation(btn)` cancels handles/removes its overlay. `burstParticles(btn)` cleans prior animation, skips for reduced motion, creates one fine ring and 14 small particles in an absolute 58px overlay, and animates the icon for about 520ms. Remove the old large body particle animation implementation.

- [ ] Use shared SVG and state sync for text and audio likes.
- [ ] Replace large burst with bounded local ring/particle effect and heart rebound.
- [ ] Verify no replay during render, rapid unlike cleanup and reduced-motion behavior.

### Task 4: Verify and package

- [ ] Parse inline script with Node `new Function` to detect syntax errors.
- [ ] Start the original local proxy with a threaded preview launcher, without changing repository server.py.
- [ ] Use Playwright with controlled content for visual/state verification, then perform a separate real API loading check.
- [ ] Capture actual dark/settings/notebook layouts and animation frames under outputs.
- [ ] Copy the completed single HTML file to outputs; commit only the scoped local changes and report local preview URL.
