# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based web scraper for Danbooru (anime artwork site) that downloads images and their associated tags. The application uses Playwright for web scraping and can handle both individual image pages and gallery pages. It's configured as an npm package with a command-line interface using yargs for argument parsing.

## Core Architecture

- **Entry point**: `index.ts` - Executable script with shebang line for CLI usage
- **DanbooruGetter class**: Thread-safe scraper using async-mutex for browser context management
  - Constructor accepts optional profile directory for persistent browser storage
  - `scrapeGalleryPage()`: Paginates through gallery pages, yielding individual image URLs
  - `scrapeImagePage()`: Extracts image URL and tags from individual post pages
  - Uses `Symbol.asyncDispose` for proper resource cleanup
  - Uses `launchPersistentContext()` for profile-based browser sessions
- **Tag processing**: Converts underscores to spaces in tag names during extraction
- **Browser configuration**: Runs Playwright Chromium with persistent context in non-headless mode
- **File output**: Downloads images with proper extensions and saves tags as comma-separated `.txt` files
- **Command-line interface**: Uses yargs for argument parsing with `--profile` option support

## Common Commands

### Build and Run
```bash
npm run build                    # Compile TypeScript to ./dist/
npm start <url>                  # Run compiled version with URL argument
npm start -- --profile /path/to/profile <url>  # Use specific browser profile
```

### Package Installation
```bash
npm install -g .                 # Install globally as 'danbooru-get' command
danbooru-get <url>              # Run from anywhere after global install
danbooru-get --profile /path/to/profile <url>  # Use specific browser profile
```

### Development
```bash
npx ts-node index.ts <url>      # Run directly with ts-node (if needed)
```

### Usage Patterns
- Single image: `npm start https://danbooru.donmai.us/posts/12345`
- Gallery page: `npm start "https://danbooru.donmai.us/posts?tags=some_tag"`
- With custom profile: `npm start -- --profile /path/to/profile <url>`
- After global install: `danbooru-get <url>`
- Global with profile: `danbooru-get -p /path/to/profile <url>`

### Command-line Options
- `--profile, -p`: Specify browser profile directory path for persistent storage
- `--help, -h`: Show usage information

## Utilities

- **count-tags.py**: Python script to analyze tag frequency across downloaded `.txt` files
  ```bash
  python count-tags.py *.txt
  ```

## Dependencies

- **Playwright**: Web scraping with Chromium browser automation (runs visible browser with persistent context)
- **yargs**: Command-line argument parsing with help generation
- **Axios**: HTTP requests for image downloads with stream support
- **async-mutex**: Thread-safe browser context management
- **mime-types**: File extension detection from Content-Type headers
- **tmp-promise**: Temporary directory management for default profiles
- **ts-node**: TypeScript execution (kept as dependency for flexibility)

## File Structure

- `index.ts`: Main executable application code (with shebang)
- `dist/`: Compiled JavaScript output (gitignored)

## Build Configuration

- TypeScript compiles to `./dist/` directory
- Package includes `bin` entry point for CLI installation
- Start script runs compiled JavaScript from dist folder