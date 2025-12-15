# Google Scholar IEEE/ACM Citation Extension

A lightweight Chrome Extension that adds **IEEE** and **ACM** citation formats directly to the Google Scholar "Cite" modal.

![Icon](icons/icon128.png)

## Features

- **⚡ Instant Injection**: Automatically adds "IEEE" and "ACM" rows to the citation modal.
- **🔒 Privacy-Focused & Robust**: Uses local parsing of APA/MLA data directly from the screen. Zero external API calls, meaning no 403 errors or CAPTCHA blocks.
- **📋 One-Click Copy**: Includes a convenient `[Copy]` button for quick usage.
- **🎨 Native UI**: Perfectly aligns with Google Scholar's existing table layout (`tr`/`th`/`td`) for a seamless look.
- **🌑 Dark Mode Friendly**: Includes specific icons and styles that look great in dark themes.
- **🌏 Region Support**: Works on `scholar.google.com`, `scholar.google.com.tw`, and other regional domains.

## Installation

This extension is built with **Manifest V3**.

1.  **Download** or **Clone** this repository to your computer.
    ```bash
    git clone https://github.com/yourusername/google-scholar-ieee-acm.git
    ```
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top-right corner).
4.  Click **Load unpacked**.
5.  Select the directory where you cloned this repository.

## Usage

1.  Go to [Google Scholar](https://scholar.google.com).
2.  Search for any paper.
3.  Click the quotation mark symbol (**Cite**) under the result.
4.  You will see **IEEE** and **ACM** appear in the list!

## Structure

- `manifest.json`: Extension configuration (MV3).
- `src/content.js`: Main logic. Detects the modal and injects the new rows using a robust anchor-based strategy.
- `src/reference_parser.js`: Parses metadata (Authors, Title, Year, etc.) from the existing APA/MLA text.
- `src/citation_formatter.js`: Formats the data into standard IEEE/ACM strings.
- `src/styles.css`: CSS for alignment and dark mode tweaks.
