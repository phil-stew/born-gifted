# Triarch: Medals of Completion

Full campaign document · July 2026

> The player begins as a young talent from Altroes and grows into the one
> person capable of uniting the three kingdoms. The story starts as a
> sports-based coming-of-age journey and evolves into a full kingdom-scale
> war against corruption.

---

## Core Premise

In Triarch, combat, survival, and sport are the same thing. Every kingdom
has **two elite schools**, and a player must complete both before earning
the **Medal of Completion** and becoming eligible to fight for their
kingdom in the **five-year tournament**.

The tournament once determined who ruled the nation peacefully. This year,
**The Corrupt One** appears, twists the ancient rules, and turns the event
into a monster war.

---

## Act 1: Altroes Rising

### Main Quest 1 — Sirblanc Beginning
The hero is introduced in Altroes, where volcanic plains and harsh storms
have made the people fast, aggressive, and tough. The player learns
movement, combat, and the basics of their sport talent.

### Main Quest 2 — First School Trial
The hero enters the first school and completes beginner missions for
nearby villages. These missions teach the player that sport skills are
used for real survival, not just competition.

### Main Quest 3 — Second School Trial
The second school raises the difficulty. The hero takes on harder combat
drills, team exercises, and a field mission against a monster threat.

### Main Quest 4 — Medal of Completion
After completing both schools, the hero earns the Medal of Completion.
This proves they are ready to represent Altroes in the kingdom's
selection trials.

---

## Act 2: The Three Kingdoms

### Main Quest 5 — Road to Lametus
The hero travels to Lametus, where rolling farmland and canyons create a
different combat style. The player meets new rivals and learns that every
kingdom trains sport talents in a unique way.

### Main Quest 6 — Road to Gale
The hero reaches Gale, where coastal cliffs, rain, and ice shape the
kingdom's training. Here the player sees a more tactical, control-based
style of play.

### Main Quest 7 — Border Missions
Each kingdom gives the hero missions from villages, showing the people's
struggles and the growing tension between kingdoms. Strange monster
attacks begin appearing more often.

### Main Quest 8 — Rival Arena
The hero faces off against elite students from the other kingdoms. These
are not just fights, but proof-of-worth battles that decide who gets
chosen for the tournament.

---

## Act 3: The Tournament Changes

### Main Quest 9 — Tournament Opening
The five-year tournament begins. At first, it follows the old style:
unique contests based on skill, power, goals, precision, and teamwork.

### Main Quest 10 — The Corrupt One Arrives
Mid-tournament, The Corrupt One appears and reveals that he has been
controlling monsters behind the scenes. He uses ancient power and his
completed medals to legitimize his claim over the kingdom.

### Main Quest 11 — Rule Breaker
The tournament rules are rewritten. It is no longer a sports competition.
It becomes full monster combat, and the kingdoms are forced to fight just
to survive.

### Main Quest 12 — Broken Alliance
The hero is pushed to team up with rivals from Lametus and Gale. Former
enemies become allies because nobody can stop The Corrupt One alone.

---

## Act 4: United Kingdoms

### Main Quest 13 — Medal Hunt
The team learns that The Corrupt One's power is tied to the ancient
system of completion medals. If he gets all six recognized by the
schools, his control over the kingdom becomes absolute.

### Main Quest 14 — Impossible Choice
The player tries to stop him from completing the remaining school
challenges, but he is too strong and too advanced. The story reveals the
hard truth: he must be defeated in the tournament itself.

### Main Quest 15 — Final Bracket
The last tournament rounds become massive monster battles across a
shattered arena that mixes all three kingdoms' terrain. The player must
use everything learned from all schools and all allies.

### Main Quest 16 — Final Match
The hero faces The Corrupt One in the final fight. Victory only comes
through teamwork, timing, and combining the strengths of all three
kingdoms.

### Main Quest 17 — New World Order
After the victory, the ancient system is broken. The kingdoms are made
equal, resources are shared, and the schools become open to everyone
instead of serving only the powerful.

---

## Structural Notes

- **17 Main Quests across 4 Acts** — this supersedes the earlier 12-MQ/
  3-Act draft (see MAIN_QUEST.md, the prior version). Key differences:
  - 4 Acts instead of 3 — the alliance/final-battle content gets its own
    Act 4 rather than sharing Act 3
  - **Six Medals total**, not one per kingdom as previously implied —
    "if he gets all six recognized by the schools" means 2 schools ×
    3 kingdoms = 6 medals. The Corrupt One's threat is completing the
    FULL set across all kingdoms, not just his own
  - Kingdom naming: **Lametus** — resolved 2026-07-04, keeping the existing
    UNIT_IDENTITY.md/PLAN.md spelling (this doc originally drafted "Lemetus")
  - New quest beats: "Rule Breaker" as its own quest, "Medal Hunt" /
    "Impossible Choice" as two distinct beats before the finale (more room
    for the moral dilemma to breathe)

## Cross-References to Existing Docs

- **Two schools per kingdom × 3 kingdoms = 6 schools total.** Same open
  question as before: what do the schools teach? With 6 schools now
  confirmed, a clean mapping could be **one school per Sport-tier-1
  cluster**, or schools could represent broader philosophies (e.g.
  Altroes: an Athletics/Combat school + a Ball/teamwork school)
- **Gale's "tactical, control-based style"** — matches Support/Defender
  designation flavor well; could mean Gale specializes in Performance +
  Defender-heavy rosters narratively
- **Lametus's canyons/farmland + "different combat style"** — Endurance/
  Stamina primary stats already fit a grinding, sustain-based style
- **The Corrupt One's kit** — now confirmed to involve monster control
  (ties directly into MONSTERS.md's designation+element skill system —
  he could literally command Alpha Ace bosses) plus his own completed
  medal-based abilities
- **Final arena "mixes all three kingdoms' terrain"** — a concrete brief
  for the Grand Arena backdrop/tileset: needs to visually blend Altroes
  (volcanic/lightning), Lametus (canyon/earth), and Gale (coastal/water)
  in one shattered arena space

## Naming Convention (decided)

- **Protagonist is player-named.** The hero's name is chosen by the player
  at character creation — dialogue, story text, and UI must reference
  `{playerName}` rather than a fixed name. (Existing docs referring to
  "Reno Sirblanc" as the protagonist are now a DEFAULT/placeholder name
  shown in design docs for convenience, not canon.)
- **Recruitable allies keep fixed names and written personalities.** Drace,
  Sela, Kael, Trice, Zora (and any future recruits) are named characters
  with their own backstories, personalities, and dialogue — same as a
  typical tactics-RPG cast (Fire Emblem style). They are NOT player-named.
- **Story-critical NPCs keep fixed names** regardless of the above — The
  Corrupt One, rival students, teachers/school figures, family members
  (e.g. the hero's father), village figures. These exist independent of
  player choice and are always canonically named.
- **Implementation note:** all story/dialogue text needs a `{playerName}`
  token system; CharacterCreationScene needs a name-entry step if not
  already present; recruit dialogue can safely hardcode ally names.

## Open Items (existing, from before)

- [x] Reconcile Lametus vs Lemetus spelling — keeping **Lametus** (2026-07-04)
- [x] Reconcile Ashfield vs Sirblanc as location names — keeping **Sirblanc** (2026-07-04)
- [ ] Define what each of the 6 schools (2 per kingdom) actually teaches —
      map to Classes/Sports
- [ ] Reconcile this 17-MQ/4-Act structure against existing M1-M15
      WorldMapScene missions — likely needs more mission slots than
      originally planned (M16+?)
- [ ] Design The Corrupt One's full kit and visual identity, including
      his monster-control mechanic in battle
- [ ] Design the "shattered arena" finale map — mixed-terrain tileset
- [ ] Confirm this document REPLACES MAIN_QUEST.md's 12-MQ draft, or the
      two should be merged
