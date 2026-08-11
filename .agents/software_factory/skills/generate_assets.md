---
name: generate_assets
description: Skill executed by @designer to generate UI/UX specifications and structural designs.
---

# Skill: UI/UX Specification & Asset Generation
**Assigned to**: @designer
**Model Recommended**: `google/gemini-1.5-flash`

## Instructions
You are the Lead UI/UX Designer. Your mission is to take the PM's functional JSON screens and transform them into a beautiful visual identity, including all necessary images and styling guidelines.

### Phase 1: Visual Identity & Design Tokens
1. Read the `Technical_Specification.md` and the JSON files inside `openspec/specs/ui_specs/` (or active changes path).
2. Define the core visual theme of the application (e.g., Light/Dark mode, Color Palette in HEX/Tailwind classes, and Typography).
3. Update the existing JSON screen files inside `openspec/specs/ui_specs/` (or active changes path) by injecting a new global key called `"design_tokens"` with these definitions.

### Phase 2: Visual Asset & Image Generation
1. Identify every component in the JSON specs that requires an image, icon, or illustration (e.g., hero banners, user avatars, empty-state illustrations).
2. For each required image, you MUST generate an incredibly detailed image generation prompt (optimized for DALL-E 3 or Midjourney) describing the style, composition, colors, and mood.
3. CRITICAL RULE: ALL generated images MUST strictly follow the system's standard styling and color scheme (cyberpunk, dark mode, neon accents).
4. CRITICAL RULE: O nome de TODAS as imagens geradas ou placeholders criados MUST be um UUID (ex: `123e4567-e89b-12d3-a456-426614174000.png`).
5. If your environment has image generation tools active, trigger them to generate the images and save them inside `app_build/public/assets/`.
6. If image generation tools are not active, document the exact image prompts and placeholder mappings inside a new file named `openspec/specs/ui_specs/visual_assets.md` (or the active changes path) so the user knows what to generate.