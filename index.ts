#!/usr/bin/env node

import { chromium, Browser, BrowserContext } from 'playwright';
import { Mutex, MutexInterface } from 'async-mutex';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import mime from 'mime-types';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { dir } from 'tmp-promise';
// Ensure tmp-promise cleans up temporary directories gracefully
require('tmp').setGracefulCleanup();

interface ScrapedData {
    imageUrl: string;
    tags: string[];
    isVideo: boolean;
}

class DanbooruGetter {
    private user_dir: string = ""
    private mutex = new Mutex();
    private browser: BrowserContext | null = null;

    constructor(user_dir: string = "") {
        this.user_dir = user_dir;
    }

    private async prepare() {
        if (this.browser) return;
        const release = await this.mutex.acquire();
        try {
            if (this.browser) return;
            if (!this.user_dir) {
                this.user_dir = (await dir({ prefix: 'danbooru-get-', unsafeCleanup: true })).path;
            }
            this.browser = await chromium.launchPersistentContext(this.user_dir, { headless: false });
        } finally {
            release();
        }
    }

    async [Symbol.asyncDispose]() {
        const release = await this.mutex.acquire();
        try {
            if (!this.browser) return;
            const b = this.browser;
            this.browser = null;
            await b.close();
        } finally {
            release();
        }
    }

    async* scrapeGalleryPage(url: string): AsyncGenerator<string> {
        await this.prepare();
        const page = await this.browser!.newPage();
        try {
            for (; ;) {
                await page.goto(url, { waitUntil: 'networkidle' });
                await page.waitForSelector('div.post-gallery');

                // 画像ページのURLを取得
                const urls = await page.evaluate(() => {
                    const urls = new Array<string>();
                    document.querySelectorAll<HTMLAnchorElement>('div.post-gallery article.post-preview a.post-preview-link').forEach(a => {
                        urls.push(a.href);
                    });
                    return urls;
                });
                for (const u of urls) {
                    yield u;
                }
                const next = await page.evaluate(() => {
                    const next = document.querySelector<HTMLAnchorElement>('div.post-gallery a.paginator-next');
                    return next ? next.href : null;
                });
                if (!next) break;
                url = next;
            }
        } finally {
            await page.close();
        }
    }

    async scrapeImagePage(url: string): Promise<ScrapedData> {
        await this.prepare();
        const page = await this.browser!.newPage();
        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.waitForSelector('#image');
            // 画像URLとタグを取得
            return await page.evaluate(() => {
                const image = document.querySelector<HTMLImageElement>('#image');
                const viewOriginal = document.querySelector<HTMLAnchorElement>('a.image-view-original-link');
                if (viewOriginal) viewOriginal.click();
                const img = document.querySelector<HTMLImageElement>('#image');
                if (!img) throw new Error("Can't find image.");
                if (img.tagName.toLowerCase() !== 'img' && img.tagName.toLowerCase() !== 'video') {
                    throw new Error("Image is not an img or video element. (maybe, animated GIF?)");
                }
                const tags = new Array<string>();
                ['artist-tag-list', 'copyright-tag-list', 'character-tag-list', 'general-tag-list'].forEach(category => {
                    document.querySelectorAll<HTMLLIElement>(`section#tag-list ul.${category} > li`).forEach(li => {
                        tags.push(li.getAttribute('data-tag-name')!.replace(/_/g, ' '));
                    });
                });

                return {
                    imageUrl: img.src,
                    tags: tags,
                    isVideo: img.tagName.toLowerCase() === 'video',
                };
            });
        } finally {
            await page.close();
        }
    }
}


async function main() {
    const argv = await yargs(hideBin(process.argv))
        .command('* <url>', 'the default command', {
            "profile": {
                alias: 'p',
                type: 'string',
                default: '',
                description: 'Chromium user profile directory for persistent storage. If not specified, a temporary directory will be used.'
            }
        }, async (argv: { profile: string }) => {
            await using getter = new DanbooruGetter(argv.profile);
            const url = (argv as any)['url'];
            if (url.match(/\/posts\/\d+/)) {
                await saveImage(getter, url);
            } else {
                for await (const u of getter.scrapeGalleryPage(url)) {
                    try {
                        await saveImage(getter, u);
                    } catch (e) {
                        console.error(`Con't save image from ${u}: `, e);
                    }
                }
            }
        })
        .help()
        .alias('help', 'h')
        .parse();
}

async function saveImage(getter: DanbooruGetter, url: string) {
    const data = await getter.scrapeImagePage(url);
    if (data.isVideo) {
        console.log(`Skipping video: ${url}`);
        return;
    }
    const id = path.basename(new URL(url).pathname);

    const response = await axios({
        url: data.imageUrl,
        method: 'GET',
        responseType: 'stream'
    });
    const contentType = response.headers['content-type'];
    if (!contentType) {
        throw new Error("Can't retrieve Content-Type");
    }

    const extension = mime.extension(contentType);
    if (!extension) {
        throw new Error(`Unknown Content-Type: ${contentType}`);
    }
    response.data.pipe(fs.createWriteStream(`${id}.${extension}`));
    console.log(`Saved image: ${id}.${extension}`);

    fs.writeFileSync(`${id}.txt`, data.tags.join(', '), 'utf8');
    console.log(`Saved tags: ${id}.txt`);
}

// 実行
main().catch(console.error);
