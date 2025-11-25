✨ ICS-Filter
A simple local application for cleaning .ics calendar files from unnecessary events

ICS-Filter is a lightweight, fully client-side web application that lets you load, analyze, filter, and download cleaned .ics calendar files. Everything runs 100% locally in your browser — no data is ever uploaded, no backend is involved, and nothing leaves your device.

With just a few clicks, you can load your .ics file, automatically detect which years and months it contains, choose what you want to keep, preview the number of remaining events, and download a new, tidy .ics file.

🌟 Features

🗂 Loads your .ics file directly in the browser

🔍 Reads and analyzes all VEVENT blocks

🗓 Automatically detects all years and months present in the file

🎛 Allows filtering events by selected years and months

👀 Live preview showing how many events will remain after filtering

📥 Generates a brand-new filtered .ics file with a custom filename

🎨 Clean dark UI with pill-style buttons and smooth interactions

📱 Fully responsive — works on desktop and mobile

🔒 100% local, private, safe

⚡ Zero dependencies — pure HTML, CSS, and Vanilla JS

Perfect for cleaning up messy Google Calendar exports, extracting specific date ranges, or preparing smaller .ics files for migration to another app or device.

💼 Tech Stack

HTML5 — UI structure

CSS3 — custom dark theme, pill buttons, responsive layout

Vanilla JavaScript — full logic for scanning, filtering, and rebuilding calendar files

FileReader API — loads the .ics file directly

Blob + URL.createObjectURL() — creates a downloadable file

No frameworks, no backend, no build tools

🧠 How It Works (High-Level)

ICS-Filter processes calendar files by scanning all VEVENT blocks found between BEGIN:VEVENT and END:VEVENT. It extracts the date from DTSTART, reads the year and month, and builds an internal index of all events:

index[year][month] = [list of VEVENTs]


This lets the app instantly filter by any combination of years and months without re-scanning the entire file.

Finally, it rebuilds a valid .ics file containing only the chosen events and offers it as a download — all done locally in memory.

🔒 Privacy

All processing happens entirely in the browser.
Your .ics file is never uploaded, stored, or logged — full privacy by design.
