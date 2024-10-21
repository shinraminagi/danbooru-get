import puppeteer, { Browser } from 'puppeteer';
import { Mutex, MutexInterface } from 'async-mutex';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import mime from 'mime-types';


interface ScrapedData {
    imageUrl: string;
    tags: string[];
}

class DanbooruGetter {
    private mutex = new Mutex();
    private browser: Browser | null = null;

    private async prepare() {
        if (this.browser) return;
        const release = await this.mutex.acquire();
        try {
            if (this.browser) return;
            this.browser = await puppeteer.launch({ headless: false });
        } finally {
            release();
        }
    }

    async [Symbol.asyncDispose]() {
        const release = await this.mutex.acquire();
        if (!this.browser) return;
        try {
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
                await page.goto(url, { waitUntil: 'networkidle2' });
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
            await page.goto(url, { waitUntil: 'networkidle2' });
            await page.waitForSelector('img#image');
            // 画像URLとタグを取得
            return await page.evaluate(() => {
                const image = document.querySelector<HTMLImageElement>('img#image');
                const viewOriginal = document.querySelector<HTMLAnchorElement>('a.image-view-original-link');
                if (viewOriginal) viewOriginal.click();
                const img = document.querySelector<HTMLImageElement>('img#image');
                if (!img) throw new Error("Can't find image.");

                const tags = new Array<string>();
                ['artist-tag-list', 'copyright-tag-list', 'character-tag-list', 'general-tag-list'].forEach(category => {
                    document.querySelectorAll<HTMLLIElement>(`section#tag-list ul.${category} > li`).forEach(li => {
                        tags.push(li.getAttribute('data-tag-name')!);
                    });
                });

                return {
                    imageUrl: img.src,
                    tags: tags
                };
            });
        } finally {
            await page.close();
        }
    }
}


async function main() {
    await using getter = new DanbooruGetter();
    const url = process.argv[2]
    if (url.match(/\/posts\/\d+/)) {
        await saveImage(getter, url);
    } else {
        for await (const u of getter.scrapeGalleryPage(url)) {
            await saveImage(getter, u);
        }
    }
}

async function saveImage(getter: DanbooruGetter, url: string) {
    const data = await getter.scrapeImagePage(url);
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
