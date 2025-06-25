# danbooru-get

A TypeScript-based command-line tool for downloading images and tags from Danbooru (anime artwork site).

## Features

- Download individual images or entire galleries
- Extract and save image tags (artist, copyright, character, general)
- Automatic file naming based on post ID
- Temporary or persistent browser profile support

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

```bash
# Single image
danbooru-get "https://danbooru.donmai.us/posts/12345"

# Gallery page  
danbooru-get "https://danbooru.donmai.us/posts?tags=some_tag"

# With custom browser profile
danbooru-get --profile /path/to/profile "https://danbooru.donmai.us/posts/12345"
danbooru-get -p /path/to/profile "https://danbooru.donmai.us/posts/12345"

# Show help
danbooru-get --help
```

## Output

The tool creates two files for each downloaded image:
- `{post-id}.{extension}` - The downloaded image file
- `{post-id}.txt` - Comma-separated tags (underscores converted to spaces)

## Command-line Options

- `--profile, -p <path>`: Specify browser profile directory for persistent storage (optional)
- `--help, -h`: Show usage information

## Requirements

- Node.js (for running the application)
- Chromium browser (automatically managed by Playwright)

## Notes

- The browser runs in visible mode (not headless) to avoid potential blocking by the website
- Profile directories allow persistent login sessions and settings across runs
- Temporary profiles are automatically cleaned up when not specified
- All browser resources are properly disposed of using modern async disposal patterns

## Author

- Shinra Minagi

## License

This project is licensed under the MIT License. See the LICENSE file for details.
