# External Data Policy

Helix Core treats third-party genomic resources as versioned evidence dependencies.

Every imported resource must record:

- provider
- resource identifier
- release/version/date
- retrieval timestamp
- URL or API endpoint
- license/terms reference
- checksum for downloaded immutable artifacts where available
- parser/transform version
- import status

Clinical outputs must retain provenance back to the external source and the exact model/database version used. A failed, stale or unavailable source must never be replaced by an invented value.

For clinical workflows, live API responses should be cached with their retrieval timestamp and source version where the provider exposes one. Bulk datasets should be immutable and release-pinned so historical analyses can be reproduced.
