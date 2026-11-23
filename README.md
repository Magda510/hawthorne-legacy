# The Hawthorne Legacy — Dynasty Studio (v6)

An offline-first Sims 4 dynasty/challenge tracker with an editable storybook design. **All ten generations are available from the beginning.** You do not need to contact the creator to change a story, trait, objective, randomizer, skill target, challenge rule, or color.

## Quick start

1. Extract the **entire ZIP**. Do not open `index.html` while it's still inside the ZIP; its images and scripts live in sibling folders.
2. Double-click **`index.html`**. The site works without an internet connection.
3. For more reliable saving across browsers, on **Windows** double-click `START-WINDOWS.bat` if Python is installed, or open a terminal in this folder and run `py -m http.server 8765`, then visit `http://localhost:8765`.
4. Open **Studio settings → Export full JSON backup** occasionally. Your browser's local data can be cleared independently of these website files.

## 2026 storyline update (v6)

- Adds the real reported divorce of Ivy Hawthorne and Redmond Red, preserving uncertainty about settlement and future contact with Primrose.
- Adds editable **Relationships & wealth** ledger, including family ties, marriage contributions and open settlement questions.
- Adds **Childhood getaways** with four season-specific editable custom trip ideas.
- Adds **Lifespan planner** with editable newborn-to-elder day values, ready to copy into MCCC.
- Adds **Storyline planner** for optional plots: Redmond’s future, Primrose as the shy Golden Child, the Wildcard villain paths, and rancher origin choices.
- Supports a one-time non-destructive upgrade of v5 browser saves; no automatic reading of The Sims 4, and existing progress remains local to your browser.
- Includes the formerly missing compressed Sims icon data scripts in GitHub Pages so in-game pictograms render on mobile. Note that these are not necessarily the exact official skill badges.

## Features

- **10 complete, editable chapters:** protagonist name, color, world, backstory, aspirations, career, traits, faults, funds, notes, objectives, points and restrictions.
- **Editable objective checklist:** add, change, remove, move up/down, score and mark completed.
- **75 Sims 4 skills:** 62 adult/teen, 4 child, 5 toddler, 4 horse. Includes Adventure Awaits and Royalty & Legacy (2026). Select different skills for different generations, track actual levels and custom targets, and add modded skills.
- **Skill image manager:** choose from **814 actual Sims 4 pictograms** from your archive, upload an image for any skill, or use **bulk image upload**. Bulk import matches filenames such as `Gardening.png`, `Skill_TS4_Gardening.png`, and `Swordsmanship.png` to their skills. Uploads and image choices are included in JSON backups.
- **Weighted family and misfortune randomizers:** editable outcomes, probabilities and conditions; family fates locked once drawn; anti-repetition; weekly duplicate protection if you provide the current Sim day.
- **Pregnancy log:** default **9 Sim days**, with conception date, due date, actual date, baby, parent(s), and birth story. Tracking only: MCCC and PandaSama are not controlled by the website.
- **Family chronicle:** editable relatives, portraits, relationships, names, traits, parentage, and timeline events.
- **Heirloom vault:** track custodians, origins, value and status of physical in-game items.
- **Bonus quest tracker:** editable bonus stories and scoring, per generation.
- **Rulebook:** add/edit/remove founding rules, including the One Sim Rule, firstborn succession, no cheats, inheritance box, and custom restrictions.
- **Appearance:** cream-and-sage, rose, or dark botanical themes, with individual generation colors.
- **Local backup:** full JSON import/export, plus best-effort import of the original v1/v3 Hawthorne tracker backup.

## Important: Skill icons

The supplied `MTS_TheSimKid_1586925_Sims4Icons.zip` is a collection of **in-game Sims 4 pictograms, mainly from older packs**. It does **not** contain a complete set of official circular skill badges, especially for expansions released after 2015. The studio uses matching Sims artwork where available and makes **no claim that an arbitrary old picture is the exact official badge**. Two skills may display a letter until you assign a suitable icon.

To make the icons exact, open **Skill atlas → Image → Upload exact badge**, or use **Import skill icons** to select many correctly named PNG/JPEG/WebP files at once. You can also choose any of the archive's 814 images for decorative use. This is deliberately self-service: no code editing required.

The web-linked skill image pack at https://luniversims.fr/files/file/1701-les-sims-4-icones-des-comp%C3%A9tences-skills-icons-all-packs/ was verified to contain original in-game skill badges, but is dated June 2020 and still does not cover recent expansions. It is **not bundled** with this ZIP.

## Original starting history

The studio starts with the user-reported Ivy Hawthorne history: Primrose (shy firstborn, biological daughter of Father Winter), Redmond Red (Ivy's husband, former frog and retired noble), the *Unexpected Beginning* fate, the nine-day pregnancy setting, and the generations/themes discussed. No unspecified dates or invented skill levels have been entered. Later generations remain planned, not pre-completed.

## Privacy & limitations

- The website does not connect to The Sims 4 game save or any mods; progress is entered manually.
- All data stays in your browser's local storage unless you export it to a file. There is no analytics or remote server.
- Browsers differ in whether `file://` pages can persist local storage. If the top bar says storage is unavailable, use `START-WINDOWS.bat` (or a local server) and import an exported JSON backup. Opening `file://` and `http://localhost` creates **different** browser storage spaces.
- Do not delete the extracted `assets` folder; it contains images. Do not open a compressed ZIP directly as a webpage.
- Some future generation objectives are editable **proposals**, not requirements previously confirmed with the player.

## Research / references

- EA's Sims 4 skill overview: https://help.ea.com/en/articles/the-sims/the-sims-4/skills/
- EA's Adventure Awaits pack description: https://www.ea.com/games/the-sims/the-sims-4/news/adventure-awaits-expansion-pack
- EA's Royalty & Legacy features: https://www.ea.com/en/games/the-sims/the-sims-4/news/royalty-and-legacy-expansion-pack
- GameSpot skills reference (February 2026): https://www.gamespot.com/articles/all-skills-in-the-sims-4-and-how-to-improve-them/1100-6531881/
- Current skills/level cross-check: https://lifesim.com/games/sims-4/skills
- The Sims Wiki's skill image category: https://sims.fandom.com/wiki/Category:Skill_icons

**Fan-made, unofficial project.** The Sims™ 4 and its visual assets belong to Electronic Arts and its licensors. The SimKid pictograms were supplied by the user. No external fonts, APIs or runtime dependencies.

## Flower-coded heir names (v5)

Every generation now displays **editable girl / boy botanical name suggestions** in its chapter page. Edit the two fields from **Generations → Edit chapter**. These suggestions do not automatically rename an existing born heir (Ivy and Primrose remain themselves). Gen 9 is white and Gen 10 is black. Existing v4 browser saves are upgraded **without overwriting** family members, goals, or other progress; default olive/lavender Gen 9/10 colors migrate to white/black. Export a backup before updating as a precaution.

- 1. The Pioneer — Ivy / (already named) — #91AD89
- 2. The Golden Child — Primrose / (already named) — #D9B655
- 3. The Wildcard — Rose / Adonis — #BA5364
- 4. The Homesteader — Lobelia / Aster — #91C5DA
- 5. The Starlet — Daphne / William — #E6A0B9
- 6. The Scholar — Iris / Hyacinthe — #A58ACB
- 7. The Entrepreneur — Ixia / Juniper — #59ADA5
- 8. The Storyteller — Hazel / Cedar — #A17B69
- 9. The Visionary — Daisy-Lys / Narcisse — #EEEDE9
- 10. The Final Heir — Calla-Lily / Cosmo — #292932
