import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import mime from 'mime-types';


interface ScrapedData {
    imageUrl: string;
    tags: string[];
}

async function scrapeImagePage(url: string): Promise<ScrapedData> {
    const browser = await puppeteer.launch({ headless: false });
    try {
        const page = await browser.newPage();
        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            await page.waitForSelector('img#image');
            console.warn('page loaded: url =', page.url());
            console.warn('page.title =', await page.title());

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
    } finally {
        await browser.close();
    }
}

async function main() {
    const url = process.argv[2]
    const data = await scrapeImagePage(url);
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

    fs.writeFileSync(`{$id}.txt`, data.tags.join(', '), 'utf8');
    console.log(`Saved image: ${id}.txt`);
}

// 実行
main().catch(console.error);
