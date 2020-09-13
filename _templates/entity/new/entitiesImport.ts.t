---
inject: true
to: src/core/entities/entities.ts
prepend: true
skip_if: from "./<%= name %>"
---
import { <%= Name %>, update<%= Name %>, create<%= Name %> } from "./<%= name %>";