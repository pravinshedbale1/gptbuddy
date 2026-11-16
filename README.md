# GPT Buddy

Live voice → questions → ChatGPT / Claude / Gemini, across two devices.

- **Transmitter** listens through the device microphone, transcribes with the browser's built-in
  speech recognition, and streams the text to the room.
- **Receiver** shows the live transcript, groups sentences into a question after a pause, and
  opens the question in ChatGPT, Claude, Gemini, Perplexity or Google AI Mode (your own logged-in
  browser sessions; no API keys).

Built with React + Vite + Firebase Realtime Database and Hosting. There's no backend server.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

Open the transmitter on `localhost` (browsers only allow the mic on `localhost` or HTTPS).
To use a second device, deploy (below) so you get an HTTPS URL.

## Deploy

```bash
npm run deploy       # builds, then deploys hosting + database rules
```

The app is served at `https://gptbuddy-yah30.web.app`.
This project uses the `pravin.itcs@gmail.com` Firebase account. If the CLI's default account is
different, run `firebase login:use pravin.itcs@gmail.com` in this folder first.

## Using it

1. Open the app, keep the generated room code, and click **Transmitter**.
2. Click **Open receiver on another device**, then scan the QR code with the other device (or open the link).
3. On the transmitter, click **Start listening**.
4. On the receiver, questions appear after each pause. Click **Ask ChatGPT** (or another AI), or press
   **Enter** to send the newest question to your default AI.
   - ChatGPT, Claude, Perplexity and Google AI Mode open with the question already filled in.
   - Gemini doesn't accept a question in the URL, so it's copied to your clipboard. Paste it with ⌘V.

## Capturing a call on the transmitter laptop itself

Browser speech recognition always listens to the system's **default input device**. To transcribe a
Zoom or Teams desktop call running on the same machine:

**macOS**
1. `brew install blackhole-2ch`, then reboot or reload audio.
2. Open **Audio MIDI Setup**, click **+**, choose **Create Multi-Output Device**, and tick both your
   speakers/headphones and BlackHole 2ch. This lets you still hear the call.
3. In the Zoom or Teams audio settings, set the **speaker** to that Multi-Output Device.
4. In **System Settings → Sound → Input**, choose **BlackHole 2ch**.
5. Start listening in the transmitter.

**Windows**: install VB-Cable, set the call's speaker to *CABLE Input*, and set the default recording
device to *CABLE Output*. To also hear the call, use "Listen to this device" on CABLE Output.

The simplest option needs no setup: play the call on another device and put the transmitter's mic
near it.

## Privacy and security

- Anyone who has a room code can read that room, and room codes can't be listed or discovered.
  Use the generated 10-character codes and click **Clear transcript** when you're done.
- Transcription uses the browser vendor's speech service (Google for Chrome).
- Make sure the people being recorded know and agree, where that's required.

## Roadmap

- Chrome extension that types questions into an open ChatGPT, Claude or Gemini tab hands-free, so
  follow-up questions keep their context.
- Electron transmitter that captures system audio directly, with no BlackHole needed.
