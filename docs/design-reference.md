# Design Reference

This document defines how the `Figma-Design/` folder is used in this repository.

## Purpose

- `Figma-Design/` contains design reference material exported as React components and related design assets.
- The folder is used as a guide for the visual design system, layouts, and interaction patterns.

## Rules

- `Figma-Design/` is not the canonical source of product behavior.
- `Figma-Design/` is not the canonical source of domain rules, permissions, workflows, or schema decisions.
- Components in `Figma-Design/` must not be used as-is when they conflict with the canonical docs in `docs/`.
- Product behavior must follow the canonical docs in `docs/`.
- Visual implementation may take inspiration from `Figma-Design/` while adapting the components to the canonical product model.

## Source Of Truth

- `docs/` is the canonical source of truth for the platform specification.
- `Figma-Design/` is a design reference.
