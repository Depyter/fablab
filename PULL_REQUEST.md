# Pull Request: Notifications & Sprint 6 Enhancements

## Overview

This pull request introduces significant updates to the service management, booking flow, and pricing logic, alongside a comprehensive UI overhaul adopting a Neo-Brutalist design language. It also adds robust test coverage for core features.

## Key Changes

### 1. Convex Backend Enhancements

- **Service Mutations**: Updated `updateService` in `convex/services/mutate.ts` to support multi-image and sample management. Included logic for claiming new files and deleting removed ones from storage.
- **Validation**: Added explicit checks to ensure services exist before attempting updates.

### 2. UI/UX Refactor (Neo-Brutalist Style)

- **Booking Flow**: Heavily updated `Step2ProjectDetails` and related components with:
  - Bold, high-contrast typography (font-black, uppercase tracking).
  - Distinctive Neo-Brutalist aesthetic: 2px/4px black borders and solid shadow offsets (`shadow-[4px_4px_0_0_#000]`).
  - Interactive feedback with hover transformations (translate-x/y on buttons).
  - Use of brand colors: `fab-teal` and `fab-magenta`.
- **Responsive Design**: Improved mobile views for headers, dialogs, and navigation elements.

### 3. Pricing & Estimation Logic

- **Project Pricing Utilities**: New functions in `src/lib/project-pricing.ts` for calculating durations from timestamp ranges and usage arrays.
- **Pricing Estimate Card**: Significant rewrite to provide more accurate and dynamic estimates based on the updated service schemas.

### 4. Testing & Reliability

- **New Test Suites**:
  - `test/chat.test.ts`: Validates unread message counts and chat membership restrictions.
  - `test/project-pricing.test.ts`: Tests the new duration and pricing calculation logic.
  - `test/service.test.ts`: Comprehensive tests for service creation, updates, and invalid booking scenarios.
- **Bug Fixes**: Addressed issues where thumbnail and sample images wouldn't update correctly.

## Files Modified

- `convex/services/mutate.ts`: Service update logic.
- `src/lib/project-pricing.ts`: Pricing utility functions.
- `src/components/booking/*`: UI updates for the booking flow.
- `src/components/projects/cards/pricing-estimate-card.tsx`: Pricing UI logic.
- `test/*`: New and updated test files.

## Impact

These changes improve the professional feel of the platform while ensuring the underlying data management and pricing logic are more robust and testable.
