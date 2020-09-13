---
inject: true
to: src/core/entities/entities.ts
after: entitiesUpdate
skip_if: :\s*update<%= Name %>
---
    [Entity<%= Name %>]: update<%= Name %>,