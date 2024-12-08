---
components:
  - name: ECM
    version: 0.1.0
    source: https://pkg.elk.wtf/ecm/ECM.jsx
    protected: true
    requires:
      - name: sugar
        version: 0.1.0
        manifest: https://pkg.elk.wtf/sugar/manifest.json
        source: https://pkg.elk.wtf/sugar/sugar.jsx
    filePath: Obsidian/Components/ECM/ECM.jsx
    manifest: https://pkg.elk.wtf/ecm/manifest.json
  - name: Rolodex
    version: 1.0.1
    source: https://pkg.elk.wtf/rolodex/Rolodex.jsx
    requires:
      - name: ScrollView
        manifest: https://pkg.elk.wtf/ScrollView/manifest.json
        source: https://pkg.elk.wtf/ScrollView/ScrollView.jsx
        version: 1.0.0
      - name: utility-hooks
        manifest: https://pkg.elk.wtf/utility-hooks/manifest.json
        source: https://pkg.elk.wtf/utility-hooks/utility-hooks.js
        version: 0.1.0
    filePath: Obsidian/Components/ECM/Rolodex.jsx
    manifest: https://pkg.elk.wtf/rolodex/manifest.json
  - name: MediaManager
    version: 0.1.0
    source: https://pkg.elk.wtf/MediaManager/MediaManager.jsx
    filePath: Obsidian/Components/ECM/MediaManager.jsx
    manifest: https://pkg.elk.wtf/MediaManager/manifest.json
    requires: []
  - name: Timelinear
    version: 1.0.0
    source: https://pkg.elk.wtf/Timelinear/Timelinear.jsx
    filePath: Obsidian/Components/ECM/Timelinear.jsx
    manifest: https://pkg.elk.wtf/Timelinear/manifest.json
    requires:
      - name: sugar
        version: 0.1.0
        manifest: https://pkg.elk.wtf/sugar/manifest.json
        source: https://pkg.elk.wtf/sugar/sugar.jsx
modified: 2024-12-08
---
