# Hello Museum

*Hello World. Meet your history.*

**[hellomuseum.tech](https://hellomuseum.tech)** | StormHacks 2026

## About

Hello, Museum is an interactive computer science museum that you can walk through in your browser. Each room covers one era of computing, from Ada Lovelace's notes in the 1800s to modern AI, and has one hands-on exhibit you can try in under 30 seconds. An AI curator answers questions and narrates each room, and a stamp quiz rewards you for finishing the tour.

It is our tribute to the people and machines that made modern computing possible, built for the **CSSS SFU CS Legacy Track**.

## The Rooms

| Room | Era | Interactive exhibit |
|---|---|---|
| 1. The Dawn | 1800s | **Ada's Engine:** step through Ada Lovelace's first program |
| 2. The Theory | 1930s-40s | **Turing Tape** puzzle and an **Enigma** code-cracking challenge |
| 3. The Giants | 1940s-60s | **Punch Card Poet** and the story of the first computer bug |
| 4. The Games | 1958-70s | **Spacewar!** / **Tennis for Two** mini-games and Conway's **Game of Life** |
| 5. The Network | 1969-90s | **First Message:** send a packet across the 4-node ARPANET |
| 6. The Now | 2000s on | **ELIZA (1966) vs. Gemini** chat, side by side |

## Features

- **Timeline hallway:** jump to any room from a single navigation bar.
- **Era styling:** each room restyles the page (engravings, green-screen terminal, 8-bit pixels, modern UI).
- **AI curator:** ask any question about an exhibit, powered by the Gemini API.
- **Voice narration:** the curator speaks each room's intro using ElevenLabs.
- **Stamp quiz:** answer one question per room to collect stamps and finish with a score.

## Tech Stack

- **Frontend:** HTML, CSS, and JavaScript (single-page app)
- **Backend:** Python (FastAPI) for exhibit logic and API calls
- **AI:** Google Gemini API for the curator's Q&A
- **Voice:** ElevenLabs for narration
- **Optional:** Tiger Data or TiDB for a visitor leaderboard and curator memory
- **Domain:** hellomuseum.tech

## Getting Started

Replace the placeholders below with your real repository details.

```bash
git clone https://github.com/YOUR-TEAM/hellomuseum.git
cd hellomuseum
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Add your API keys to the `.env` file:

```
GEMINI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
```

Then open <http://localhost:8000> in your browser.

## Project Structure

```
hellomuseum/
  main.py            # FastAPI app and routes
  static/            # HTML, CSS, JS
  rooms/             # one folder per room and exhibit
  curator.py         # Gemini Q&A
  narrate.py         # ElevenLabs voice
  requirements.txt
  .env.example
```

## Prize Tracks

- CSSS SFU CS Legacy Track (core: a tribute to computing history)
- Best Design (era styling and museum feel)
- SSSS Python Track (Python backend and exhibit logic)
- MLH: Gemini API, ElevenLabs, and Best .Tech Domain Name
- Best Game (stamp quiz and mini-game exhibits)

## Team

Add your team members, roles, and links here.

## Credits

Hello, Museum honors Ada Lovelace, Alan Turing, Grace Hopper, the builders of Spacewar! and Tennis for Two, the ARPANET team, Joseph Weizenbaum (ELIZA), and John Conway. Historical text was written by our team.
