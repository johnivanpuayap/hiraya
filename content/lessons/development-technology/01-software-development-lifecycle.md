---
title: "Software Development Lifecycle"
category_slug: "development-technology"
order: 1
estimated_minutes: 10
quiz:
  - prompt: "Which SDLC phase is primarily concerned with translating requirements into technical specifications?"
    options:
      - text: "Requirements gathering"
      - text: "Design"
        correct: true
      - text: "Implementation"
      - text: "Maintenance"
    explanation: |
      **Design** is where requirements are translated into architecture,
      interfaces, and data models. Requirements gathering precedes it;
      implementation follows it.

  - prompt: "In a Waterfall SDLC, what is the consequence of discovering a requirements defect during implementation?"
    options:
      - text: "Trivial — change the code and continue"
      - text: "Requires iterating back through design and possibly requirements"
        correct: true
      - text: "Defect is deferred to maintenance"
      - text: "Defect is ignored until the next release"
    explanation: |
      Waterfall is sequential — requirements feed design, which feeds
      implementation. A requirements defect found late typically forces the
      team to revisit design and requirements, which is why Waterfall is
      expensive under changing requirements.

  - prompt: "Which practice is MOST associated with Agile but not Waterfall?"
    options:
      - text: "Written requirements documents"
      - text: "Fixed-scope long-term plans"
      - text: "Iterative delivery with frequent stakeholder feedback"
        correct: true
      - text: "Detailed upfront design"
    explanation: |
      Agile emphasizes short iterations (typically 1–4 weeks) delivering
      working software, with stakeholder feedback gathered after every
      iteration. The other three options are hallmarks of plan-driven
      approaches like Waterfall.
---

# Software Development Lifecycle

The **Software Development Lifecycle (SDLC)** is the structured sequence of
phases a software project goes through, from idea to retirement.

## Core phases

1. **Requirements** — understand what the system must do.
2. **Design** — decide how it will do it (architecture, data model, interfaces).
3. **Implementation** — write the code.
4. **Testing** — verify it works.
5. **Deployment** — release to users.
6. **Maintenance** — fix bugs, add features, evolve.

Different process models organize these phases differently.

## Waterfall vs Agile

**Waterfall** runs the phases in order, once. Each phase has a gate:
requirements must be "done" before design starts, design must be "done" before
implementation starts, and so on. The strength is predictability; the weakness
is rigidity when requirements shift.

**Agile** runs all the phases in short iterations (sprints). Every sprint
produces working software. The strength is adaptability; the trade-off is
harder long-term planning.

## Why PhilNITS asks about this

PhilNITS Fundamental IT Engineer exam questions frequently test:

- Ordering of SDLC phases
- When a defect is cheapest to fix (earlier is exponentially cheaper)
- Differences between plan-driven and iterative models
- Matching a scenario to the right model

Focus on the **definitions** of each phase and the **trade-offs** between
Waterfall and Agile — those carry most of the exam weight.
