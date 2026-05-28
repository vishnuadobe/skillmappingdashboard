# Org Chart Authoring

This block renders a mock manager org chart using the data in `blocks/org-chart/org-chart.js`. Authors only need to provide a small config table in the block.

## Block Name

`org-chart`

## Supported Fields

Use a two-column table inside the block:

| Field | Value |
| --- | --- |
| `heading` | Optional custom title shown above the chart |
| `view` | Optional. Currently only `manager` is supported |
| `user-id` | Optional manager id. Default is `atul-bansal` |
| `profile-path` | Optional profile page path. Default is `/empprofile` |

## Example

| heading | Welcome, Atul Bansal |
| view | manager |
| user-id | atul-bansal |
| profile-path | /empprofile |

## Current Behavior

- If `heading` is omitted, the block shows a personalized welcome message.
- If `view` is not `manager`, the block shows an empty-state message.
- If `user-id` does not match the mock manager in the block data, the block shows a fallback message.
- Clicking a card opens the employee profile using `?manager={managerId}&emp={employeeId}`.

## Notes

- The current implementation uses mock data embedded in the block JavaScript.
- Employee view is not implemented yet.
- The manager and direct reports shown today are driven entirely by `ORG_DATA`.
