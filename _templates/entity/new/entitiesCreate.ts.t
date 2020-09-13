---
inject: true
to: src/core/entities/entities.ts
after: entitiesCreate
skip_if: :\s*create<%= Name %>
---
    [Entity<%= Name %>]: create<%= Name %>,