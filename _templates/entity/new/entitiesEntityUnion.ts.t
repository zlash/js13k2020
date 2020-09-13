---
inject: true
to: src/core/entities/entities.ts
after: Entity = 
skip_if: Entity = .* <%= Name %>
---
 <%= Name %> | 
