# IronBeat — User Guide

IronBeat is your private workout music vault: instant search, one-tap moods, your own playlists, and audio that keeps playing while you move through the app or pocket your phone.

Your account is created instantly. There is no approval queue. Everything you save — playlists, favorites, search chips, recent plays — is visible only to you.

---

## 1. Create your account

1. Open IronBeat in your browser.
2. On the sign-in screen, tap **Create your vault**.
3. Enter an optional name, your email, and a password of at least 8 characters. Type the password twice.
4. Tap **Start lifting**.

You are signed in immediately and dropped onto the Home screen. Your vault starts empty and fills up as you search, save, and build playlists.

> Choose a password you have not reused elsewhere. IronBeat hashes passwords with bcrypt and never stores them in plain text.

---

## 2. Add IronBeat to your iPhone home screen

IronBeat is a Progressive Web App (PWA). Installed from Safari, it behaves like a native app: its own icon, fullscreen layout, and no browser bars.

1. Open the IronBeat URL in **Safari** on your iPhone. (This must be Safari — Chrome and in-app browsers on iOS cannot add web apps to the home screen.)
2. Tap the **Share** button (the square with an arrow).
3. Scroll and tap **Add to Home Screen**.
4. Keep the name **IronBeat** and tap **Add**.

The custom charcoal-and-amber IronBeat icon is already configured, sized, and padded for iOS — you do not need to upload anything. Launch IronBeat from that icon for the fullscreen experience.

**Old icon showing?** iOS caches home-screen icons aggressively. Remove the app from the home screen and add it again.

**Android:** In Chrome, open the menu and choose **Install app** or **Add to Home screen**.

---

## 3. Pick your look

Open **Settings** (the bottom tab with the sliders icon) → **Appearance**.

| Theme | Vibe |
| --- | --- |
| **Warm Neutral** | Soft cream, rich charcoal, warm amber. The default. |
| **Monochrome Ink** | High-contrast editorial black and off-white. Zero color noise. |
| **Sunset Glow** | Cream with a hot sunset-orange accent and charcoal containers. |

Tap a theme and it applies instantly across every screen. Your choice is saved on this device and to your account, so it follows you to another device after sign-in.

---

## 4. The Home screen

Home is built for zero-friction starts.

- **Hero search** — the large search bar at the top. Type a vibe such as `brazilian phonk`, `gym motivational speech`, or `nasheed`.
- **Quick-launch chips** — a horizontal row under the search bar. These are your past successful searches; tap one to launch that search and start playing immediately. New accounts see starter suggestions until their own history builds up.
- **Smart Shuffle** — a single dark card that builds a fresh mix from your searches, favorites, and recent plays.
- **Vibe Deck** — all eight moods are on Home. There is no “All Moods” page and no extra menu. Tap any card and the music starts.
- **Jump back in** — a horizontal rail of recent tracks. Tap any cover to resume that queue.
- **Saved for the next set** — your favorites, when you have some.

### The eight moods

| Mood | Energy |
| --- | --- |
| ⚡ Phonk & Hype | Brazilian phonk, heavy and fast. |
| 🎧 Focus & Nasheed | Calm, steady, present. |
| 🔥 Aggressive Lift | Maximum-output training music. |
| 🧊 Cool Down | Bring the heart rate down. |
| 🏋️ Heavy Bass | Low end for heavy sets. |
| 🚀 Beast Mode | Hardstyle, no excuses. |
| 🏃 Cardio Flow | Keep the pace moving. |
| 🌌 Synthwave Energy | Neon lights, iron plates. |

Tapping a mood searches for a matching mix and starts the first result automatically. The rest of the results become your queue.

---

## 5. Instant search and autoplay

1. Type a query in the search bar and submit.
2. The Search view loads the results and — when autoplay is enabled — starts the first track.
3. The whole result list becomes the queue. When a track ends, the next one starts even if your phone is locked.
4. Tap any result to jump to it. Tap **Play all** to restart the queue from the top, or the shuffle icon to play the results in random order.

Searches that return results are saved as quick-launch chips. Searching for something with no results does not pollute your chips.

If your browser blocks the automatic start (common on mobile), you will see **“Tap play to start audio”** in the mini player or full player. One tap is all it takes; later tracks autoplay normally.

---

## 6. The player: mini, full, and locked screen

### Mini player

Once something is playing, a compact player docks above the bottom tabs. It shows artwork, title, artist, a progress hairline, play/pause, and next.

- Tap the **track info** to open the full player.
- Tap the **play/pause** button to control playback without leaving the page.

### Full player

Tap the mini player to expand the full-screen player:

- Large artwork and title.
- Draggable progress bar with current time and total time.
- Shuffle, previous, play/pause, next, and repeat (off → all → one).
- Favorite (heart) and add-to-playlist buttons.
- **Up next** queue preview. Tap a queued track to jump to it.

Tap the chevron at the top (or press Escape on a keyboard) to close the player without stopping the music.

### Background playback and the iPhone lock screen

IronBeat is designed to keep playing when you leave the app or lock the screen:

- Start audio with a tap at least once per session.
- Press the home gesture or lock the phone; audio continues.
- The lock screen and Control Center show the track title, artist, and artwork.
- Lock-screen controls support **play**, **pause**, **previous**, **next**, and **seeking**.
- Changing pages inside IronBeat (Home, Search, Library, Settings) never restarts or interrupts the current track.

If audio stops on lock, confirm you are using Safari/installed Safari web app, start playback with a tap first, and check Low Power Mode. In-app browsers (Instagram, Gmail, etc.) do not support this behavior — open IronBeat in Safari or from its home-screen icon.

---

## 7. Playlists

Open **Library** (bottom tab, list icon) → **Playlists**.

### Create a folder

1. Tap **New** (top right) or the **Create playlist** empty-state button.
2. Enter a name, optional description, and pick an emblem.
3. Tap **Create playlist**.

Limit: 30 playlists per account, 300 tracks per playlist.

### Add tracks from search

1. Search for a track.
2. Tap the **+** (add to playlist) button on the result row.
3. Choose an existing folder, or tap **New playlist** to create one and add the track in a single step.

### Play a folder

- Tap the **play** button on the playlist card to queue the whole folder.
- Open the folder and tap **Play all** or **Shuffle**.

### Edit or delete

Open the folder → pencil icon (top right). Rename it, change the emblem or description, or delete it permanently. Deletion removes the folder and its saved track entries; it does not delete the tracks from your favorites or search history.

### Remove a track

Open the folder and tap the trash icon on a track row. The track is removed from that folder only.

---

## 8. Favorites, recent plays, and Smart Shuffle

### Favorites

Tap the **heart** on any track row or in the full player. Favorites are account-scoped and appear under **Library → Favorites** and on Home.

### Recent plays

**Library → Recent** lists tracks you have played, deduplicated and ordered by most recent. Tap one to restart it.

### Smart Shuffle

Tap **Smart Shuffle** on Home or Library. IronBeat looks at:

- your most-used search queries,
- the artists behind your favorites and recent plays,
- your saved favorite tracks.

It searches those directions, merges the results with your favorites, shuffles them, and starts a 30-track training mix. If you are brand new, it falls back to proven workout searches so there is always something to lift to.

---

## 9. Settings

**Settings** contains:

- **Profile** — your name, email, and member-since date.
- **Appearance** — the three themes.
- **iPhone home screen** — installation steps and what is already configured.
- **Data** — clear search history (chips only; playlists and favorites stay) and sign out.
- **About** — privacy model, audio source note, and the project repository.

Signing out clears the current session, stops the track, and returns you to the sign-in screen. Your vault remains on your account for the next sign-in.

---

## 10. Privacy

- Each account has an isolated container. Queries for playlists, favorites, search history, and plays are scoped to your user ID on the server — not filtered in the browser.
- Passwords are bcrypt-hashed. Sessions are signed HTTP-only cookies, not localStorage tokens.
- Search history powers your chips and Smart Shuffle. Clear it any time in Settings.
- IronBeat does not use the official YouTube API. Track metadata and streams come from community Piped/Invidious instances.

---

## 11. Troubleshooting

| Problem | What to do |
| --- | --- |
| No sound after starting a vibe | Tap the play button once. Mobile browsers often require a direct tap before media can start. |
| “Tap play to start audio” banner | The browser still blocked autoplay. Tap the play button; later tracks will autoplay. |
| A track skips instantly | That provider could not deliver the audio. IronBeat automatically tries the next source and track. Try again or choose another result. |
| Search says the music service is unavailable | Public instances can be briefly down or rate-limited. Wait a minute and retry. |
| Audio stops when the screen locks | Use Safari or the installed home-screen app, start with a tap, and check Low Power Mode / in-app browser behavior. |
| iPhone still won’t start audio | Check that Settings shows **IronBeat v1.1.2** and **iOS relay**, then fully close and reopen the app. Tap the play button once if the app asks. If it still fails, remove the home-screen app and re-add it from Safari to clear an old cached bundle. |
| Home-screen icon looks outdated | Remove the app from the home screen and add it again from Safari. |
| PWA shows an old version | Close all app instances, reopen, or remove/re-add the home-screen app. |
| “Too many requests” | Wait for the cooldown shown by the retry interval, then try again. |
| Signed out unexpectedly | Sessions last 30 days and are invalidated if the server’s signing secret rotates. Sign in again. |

---

## 12. Gym-floor tips

- Pick a long mix for a full session, or a 20-song queue for a focused block.
- Use one playlist per training day (Push / Pull / Legs) and one for PR attempts.
- Let the phone lock between sets — the queue advances without waking it.
- Build Smart Shuffle after a week of searching and favoriting; it gets more personal with use.
- In a crowded gym, keep the mini player visible for one-thumb control; leave the full player closed for the least obstruction.

Now load the bar, tap a vibe, and get to work.
