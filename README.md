# danbooru-get

A TypeScript-based command-line tool for downloading images and tags from Danbooru (anime artwork site).

## Features

- Download individual images or entire galleries
- Extract and save image tags (artist, copyright, character, general)
- Automatic file naming based on post ID
- Thread-safe browser management
- Support for various image formats (jpg, png, webp, etc.)

## Installation

### Local Installation
```bash
git clone <repository-url>
cd danbooru-get
npm install
npm run build
```

### Global Installation
```bash
npm install -g .
```

## Usage

### After Local Installation
```bash
# Single image
npm start "https://danbooru.donmai.us/posts/12345"

# Gallery page
npm start "https://danbooru.donmai.us/posts?tags=some_tag"
```

### After Global Installation
```bash
# Single image
danbooru-get "https://danbooru.donmai.us/posts/12345"

# Gallery page  
danbooru-get "https://danbooru.donmai.us/posts?tags=some_tag"
```

## Output

The tool creates two files for each downloaded image:
- `{post-id}.{extension}` - The downloaded image file
- `{post-id}.txt` - Comma-separated tags (underscores converted to spaces)

## Requirements

- Node.js (for running the application)
- Chromium/Chrome browser (automatically managed by Puppeteer)

## How It Works

1. Uses Puppeteer to automate a Chrome browser
2. Navigates to Danbooru pages and extracts image URLs and tags
3. Downloads images using Axios with streaming
4. Saves tags as text files with proper formatting
5. For gallery pages, automatically paginates through all results

## Note

The browser runs in visible mode (not headless) to avoid potential blocking by the website.

## Author

- Shinra Minagi

## License

This project is licensed under the MIT License. See the LICENSE file for details.
