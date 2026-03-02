# Night Ceremony Voice-Over Spec

## Voice Style
- **Tone:** calm, ceremonial, measured — like a narrator guiding a ritual
- **Pace:** slow and deliberate; leave natural pauses between phrases
- **Volume:** consistent across all files (normalize to -14 LUFS or similar)
- **Language:** English

## Output Format
- Format: MP3
- Sample rate: 44100 Hz
- Bitrate: 128 kbps or higher
- File naming: exact filenames listed below (case-sensitive)
- Drop files into this directory (`client/public/assets/audio/night/`)

---

## Files

| Filename | Script |
|----------|--------|
| `01-close-eyes.mp3` | "Everyone, close your eyes and put out your fists." |
| `02-minions-open-std.mp3` | "Minions of Mordred, open your eyes and look around. Know your allies." |
| `02-minions-open-excl-oberon.mp3` | "Minions of Mordred — excluding Oberon — open your eyes and look around. Know your allies." |
| `02b-minions-close.mp3` | "Minions of Mordred, close your eyes." |
| `03-minions-thumbs-std.mp3` | "Minions of Mordred, raise your thumbs so Merlin can see you." |
| `03-minions-thumbs-excl-oberon.mp3` | "Minions of Mordred — excluding Oberon — raise your thumbs so Merlin can see you." |
| `03-minions-thumbs-excl-mordred.mp3` | "Minions of Mordred — excluding Mordred — raise your thumbs so Merlin can see you." |
| `03-minions-thumbs-excl-mordred-oberon.mp3` | "Minions of Mordred — excluding Mordred and Oberon — raise your thumbs so Merlin can see you." |
| `04-merlin-open.mp3` | "Merlin, open your eyes. The raised thumbs belong to Evil." |
| `05-merlin-close.mp3` | "Merlin, close your eyes. Minions, lower your thumbs." |
| `06-percival-thumbs-no-morgana.mp3` | "Merlin, raise your thumb." |
| `06-percival-thumbs-with-morgana.mp3` | "Merlin and Morgana, raise your thumbs." |
| `07-percival-open.mp3` | "Percival, open your eyes. Find Merlin among the raised thumbs." |
| `08-percival-close-no-morgana.mp3` | "Percival, close your eyes. Merlin, lower your thumb." |
| `08-percival-close-with-morgana.mp3` | "Percival, close your eyes. Merlin and Morgana, lower your thumbs." |
| `09-wake-up.mp3` | "Everyone, open your eyes. Day begins." |

---

## Notes
- File `02` has two variants (`std` vs `excl-oberon`). The app picks the right one based on whether Oberon is in the selected roles.
- File `02b` always plays after `02` (minions close eyes before raising thumbs for Merlin).
- File `03` has four variants based on which of Mordred/Oberon are selected: `std`, `excl-oberon`, `excl-mordred`, `excl-mordred-oberon`. Mordred is excluded because Merlin already knows who Mordred is.
- Files `06`, `08` each have two variants (`no-morgana` vs `with-morgana`). Only used when Percival is in the selected roles.
- File `01` always plays first; `09` always plays last.
- Missing files are handled gracefully — the step advances after a timeout — so you can generate files incrementally.
