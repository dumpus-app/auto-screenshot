import puppeteer, { KnownDevices } from 'puppeteer';
import chalk from 'chalk';
import devices from './devices.json' assert { type: "json" };

import fs from 'fs';

import dotenv from 'dotenv';
dotenv.config();

const forceRebuild = process.argv.includes('-f');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    
    console.log(chalk.yellowBright(`Warming up...`))
    
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    if (process.env.AUTH_ENABLED === "true") {
        console.log(chalk.yellowBright(`Authenticating...`))
        await page.authenticate({
            username: process.env.AUTH_USERNAME,
            password: process.env.AUTH_PASSWORD
        });
    }

    console.log(chalk.yellowBright(`Loading package...`))

    await page.goto(`https://web.dumpus.app/en/onboarding/loading/?packageLink=${encodeURIComponent(`https://click.discord.com/ls/click?upn=${process.env.UPN_KEY}`)}&backendURL=`);

    await page.waitForFunction(text => !!Array.from(document.querySelectorAll('button[type="button"]')).find(el => el.textContent === text), {}, "Share");

    console.log(chalk.bgGreen(`Warmed up!`));

    for (let device of devices) {

        console.log(chalk.yellowBright(`${device} Starting...`));

        const screenExists = fs.existsSync(`screenshots/${device.replace(/[\W_]+/g, "-")}-main.png`);
        if (screenExists && !forceRebuild) {
            console.log(chalk.bgGreen(`${device} Already exists, skipping...`));
            continue;
        }
        
        await page.emulate(KnownDevices[device]);
        await page.waitForNetworkIdle();

        await page.evaluate(() => {
            const hasTwoChildren = document.getElementsByClassName('bottom-safe-area-bottom-inset')[0].children.length === 2;
            if (!hasTwoChildren) return;
            const bottomSafeAreaBottomInset = document.getElementsByClassName('bottom-safe-area-bottom-inset')[0];
            bottomSafeAreaBottomInset.children[0].remove();
            if (bottomSafeAreaBottomInset.children[0]) {
                bottomSafeAreaBottomInset.children[0].style.borderRadius = '5% 5% 0% 5%';
            }
        });

        // screenshot main page
        await page.screenshot({
            path: `screenshots/${device.replace(/[\W_]+/g, "-")}-main.png`
        });

        console.log(chalk.yellowBright(`${device} 1/4 screenshots taken...`));

        await page.evaluate(() => document.querySelector('a[href="/en/top/dms/"]').click());
        await page.waitForNetworkIdle();

        // screenshot DMs page
        await page.screenshot({
            path: `screenshots/${device.replace(/[\W_]+/g, "-")}-dms.png`
        });

        console.log(chalk.yellowBright(`${device} 2/4 screenshots taken...`));

        await page.evaluate(() => document.querySelector('a[href="/en/stats/"]').click());
        await page.waitForNetworkIdle();

        // screenshot stats page
        await page.screenshot({
            path: `screenshots/${device.replace(/[\W_]+/g, "-")}-stats.png`
        });

        console.log(chalk.yellowBright(`${device} 3/4 screenshots taken...`));

        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });

        // let scroll and bar disappear 
        await sleep(2000);

        await page.screenshot({
            path: `screenshots/${device.replace(/[\W_]+/g, "-")}-stats-2.png`
        });

        await page.evaluate(() => document.querySelector('a[href="/en/overview/"]').click());

        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });

        await sleep(2000);

        console.log(chalk.yellowBright(`${device} 4/4 screenshots taken...`));

        console.log(chalk.bgGreen(`${device} completed!`));

    }

    await browser.close();
})();