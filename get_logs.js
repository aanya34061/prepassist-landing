import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
        page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
        
        console.log('Navigating...');
        const response = await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
        console.log('Status:', response.status());
        
        await new Promise(r => setTimeout(r, 2000));
        
        const html = await page.evaluate(() => document.body.innerHTML);
        console.log('BODY LENGTH:', html.length);
        
        await browser.close();
    } catch (e) {
        console.error('PUPPETEER ERROR:', e);
    }
})();
