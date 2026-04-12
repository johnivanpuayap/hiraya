# Hiraya — Design Document

## Overview

**Name:** Hiraya
**Tagline:** "Aral hanggang pasa" (Study until you pass)
**What it is:** A friendly, adaptive PhilNITS exam reviewer that tracks your progress and helps you prepare with confidence.

**Origin:** From "Hiraya Manawari" — an ancient Filipino phrase meaning "may the wishes of your heart be granted" or "the reach of one's imagination."

## Target Audience

- Students preparing for the PhilNITS (Philippines Nationals in Information Technology Series) certification exam
- Educators overseeing PhilNITS exam preparation and student assessment

## Product Direction

- Starts as a community/open-source project, designed to grow into a commercial product
- Complete platform overhaul of the previous "Adaptive Philnits" project — new tech, new UX, same PhilNITS focus

---

## Visual Identity

### Personality

- Friendly and approachable — welcoming for students
- Playful on the surface, serious about progress underneath
- Warm and hopeful — the feeling of a new day and new possibilities

### Color Palette — "Golden Study Nook"

| Role            | Color / Value                                              | Hex / CSS                          |
|-----------------|------------------------------------------------------------|------------------------------------|
| Primary         | Deep amber                                                 | `#C77B1A`                          |
| Primary Light   | Warm gold                                                  | `#E6A040`                          |
| Primary Glow    | Tinted backgrounds, hover states                           | `rgba(199, 123, 26, 0.15)`        |
| Secondary       | Rich terracotta                                            | `#B85A3B`                          |
| Background      | Warm gradient (afternoon light)                            | `linear-gradient(160deg, #FBF4E9, #F6EDD8, #F2E5CF)` |
| Surface/Cards   | Frosted glass                                              | `rgba(255, 250, 240, 0.75)` + `backdrop-filter: blur(12px)` |
| Surface Solid   | Fallback for no-blur contexts                              | `#FFFAF0`                          |
| Glass Border    | Warm golden tint                                           | `rgba(199, 123, 26, 0.15)`        |
| Success         | Muted forest green                                         | `#5A8E4C`                          |
| Danger          | Refined deep red                                           | `#BF4A2D`                          |
| Text Primary    | Deep espresso                                              | `#2A1D0E`                          |
| Text Secondary  | Warm mid-brown                                             | `#6B5640`                          |
| Text Muted      | Labels, metadata                                           | `#9C876E`                          |
| Border          | Subtle warm dividers                                       | `rgba(139, 94, 60, 0.1)`          |

### Typography

- **Headings:** Bookish, editorial serif (DM Serif Display) — warm cafe personality
- **Body:** Clean, readable sans-serif (Inter)
- **Pairing rationale:** Serif headings + sans body creates natural hierarchy without heavy weights or color tricks

### Illustration Style

- Hand-drawn line icons with warm fills
- Subtle Filipino-inspired flourishes — not heavy-handed, just enough to feel local
- Small sunrise rays, stars, and soft curved lines as decorative accents
- No mascot — playful icons and illustrations carry the personality

### Layout & Feel

- **Aesthetic:** Golden Study Nook — cozy study cafe atmosphere
- Frosted glass cards over warm gradient backgrounds
- Ambient light effects (golden and terracotta radial glows, fixed position)
- 16px border radius on cards, warm golden-tinted borders and shadows
- Progress bars, streaks, stats — data-forward where it matters
- Subtle, smooth motion only (CSS transitions, no animation libraries)
- Card hover: lift + shadow deepen. Option hover: slide right. Button hover: lift.
- Like studying at your favorite coffee shop — warm, inviting, relaxed focus
