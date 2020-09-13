---
inject: true
to: src/core/entities/entities.ts
before: // Maker for new entities
skip_if: Entity<%= Name %>
---
export const Entity<%= Name %>: %NUMBER% = %NUMBER%;